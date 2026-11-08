// STEP 5. 교정 에디터
// - 문단별 실시간 검토(위험·주의 표시) + 감점 상세·추천 교정안·즉시 적용 + 실시간 예측 성적
// - 휴대폰(899px 이하): "원문 검토 / 수정 목록" 2개 보기, 표시를 누르면 아래에서 상세 시트가 올라옴
import { topbar, tabbar, icon, esc, mascotTalk, toast, player, SEVERITY } from '../ui.js';
import { mascot } from '../mascot.js';
import { applyFix } from '../analyzer.js';

const DESKTOP_VIEWS = { split: ['view_column', '2단 분할 뷰'], doc: ['article', '원문 집중'], solution: ['auto_fix_high', 'AI 솔루션'] };
const MOBILE_VIEWS = { doc: ['article', '원문 검토'], solution: ['checklist', '수정 목록'] };
const MOOD = { danger: 'danger', warning: 'quiz', safe: 'cheer' };
const keyOf = (i, text) => `${i.title}|${i.start >= 0 ? text.slice(i.start, i.end) : ''}`;
const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches;

// 문단(줄) 단위 하이라이트와 주석. 겹치는 표시는 위험 > 주의, 앞선 것 우선
function renderLines(text, issues, selectedId) {
  const marks = [];
  let pos = -1;
  for (const i of issues.filter(x => x.start >= 0).sort((a, b) => a.start - b.start || (a.severity === 'danger' ? -1 : 1))) {
    if (i.start < pos) continue;
    marks.push(i);
    pos = i.end;
  }
  const out = [];
  let offset = 0, no = 0, passed = 0;
  for (const line of text.split('\n')) {
    const ls = offset, le = offset + line.length;
    offset = le + 1;
    if (!line.trim()) { out.push('<div class="line empty" aria-hidden="true"></div>'); continue; }
    no++;
    let html = '', p = ls;
    for (const m of marks.filter(x => x.start < le && x.end > ls)) {
      const s = Math.max(m.start, ls), e = Math.min(m.end, le);
      html += esc(text.slice(p, s));
      html += `<mark class="hl ${m.severity} ${m.id === selectedId ? 'sel' : ''}" data-id="${m.id}" tabindex="0" role="button" aria-label="${SEVERITY[m.severity]}: ${esc(m.title)}">${esc(text.slice(s, e))}</mark>`;
      p = e;
    }
    html += esc(text.slice(p, le));
    const starts = issues.filter(i => i.start >= ls && i.start <= le);
    const worst = starts.some(i => i.severity === 'danger') ? 'danger' : starts.length ? 'warning' : '';
    if (!starts.length) passed++;
    const notes = starts.slice(0, 2).map(i => `<div class="note ${i.severity}">${icon(i.severity === 'danger' ? 'error' : 'warning', 'fill')}<span>${SEVERITY[i.severity]}: ${esc(i.title)} (-${i.gain}점)</span><button class="fixit" data-select="${i.id}">${i.severity === 'danger' ? '수정 필요' : '보기'}</button></div>`).join('');
    out.push(`<div class="line ${worst ? `has-${worst}` : ''}"><span class="no">${no}</span><div><div class="tx">${html}</div>${notes}</div></div>`);
  }
  return { html: out.join(''), paragraphs: no, passed };
}

function issueCard(sel, issues, input) {
  const text = input.text;
  const n = issues.filter(i => i.severity === sel.severity).indexOf(sel) + 1;
  const profSays = sel.category === 'instruction' && input.instructions;
  return `<section class="card issue-card" aria-live="polite">
    <div class="between" style="align-items:flex-start"><h2 class="issue-title ${sel.severity}">${icon(sel.severity === 'danger' ? 'error' : 'warning', 'fill')}<span>${SEVERITY[sel.severity]} ${n}: ${esc(sel.title)}</span></h2><span class="chip ${sel.severity === 'danger' ? 'red' : 'yellow'}">-${sel.gain}점 방어</span></div>
    <div class="box prof"><div class="label">${icon('campaign')}${profSays ? '교수님 지시' : '감점 이유'}</div>
      ${profSays ? `<p class="b" style="margin:0 0 6px">"${esc(input.instructions)}"</p>` : ''}
      <p style="margin:0">${esc(sel.reason)}</p></div>
    <div class="box fix"><div class="between"><div class="label">${icon('auto_fix_high')}A-Flo 추천 교정안</div>${sel.source === 'ai' ? '<span class="chip green xs">AI 제안</span>' : ''}</div>
      ${sel.start >= 0 ? `<p class="old">${esc(text.slice(sel.start, sel.end))}</p>` : ''}
      <p class="new">${esc(sel.fix != null ? sel.fix : sel.suggestion)}</p>
      ${sel.fix != null && sel.suggestion && sel.suggestion !== sel.fix ? `<p class="sm muted b" style="margin:8px 0 0">${esc(sel.suggestion)}</p>` : ''}
    </div>
    ${sel.fix != null ? `<button class="btn blue big" data-act="apply">✨ 추천 수정안 바로 적용</button>` : `<p class="sm muted b" style="margin:0">${icon('info')} 이 항목은 직접 고쳐야 해요. "직접 수정"을 눌러 주세요.</p>`}
    <div class="two">
      <button class="btn sm" data-act="ignore">${icon('visibility_off')}무시하기</button>
      <button class="btn sm" data-act="edit">${icon('edit')}직접 수정</button>
    </div>
  </section>`;
}

// 한 번에 고쳐도 안전한 항목: 규칙 엔진이 만든 맞춤법·띄어쓰기·어미·참고문헌 형식
// (출처 자리 표시를 넣는 수정과 AI 내용 수정은 하나씩 확인하도록 제외)
const BULK_SKIP = new Set(['출처 없는 직접 인용', '근거 없는 수치']);
export function bulkFixable(issues) {
  const picked = [];
  for (const i of issues) {
    if (i.fix == null || i.start < 0 || i.source === 'ai' || BULK_SKIP.has(i.title)) continue;
    if (picked.some(p => i.start < p.end && i.end > p.start)) continue;
    picked.push(i);
  }
  return picked;
}
export function applyMany(text, picked) {
  return [...picked].sort((a, b) => b.start - a.start).reduce((t, i) => applyFix(t, i), text);
}

function historyCard(edits) {
  if (!edits?.length) return '';
  const last = edits.slice(-6).reverse();
  return `<section class="card stack">
    <div class="between"><h2 class="card-title">${icon('history')}수정 기록 ${edits.length}건</h2><button class="btn sm" id="undo">${icon('undo')}되돌리기</button></div>
    <ul class="edit-log">${last.map(e => `<li><div class="between sm"><b>${esc(e.title)}</b><span class="${e.after >= e.before ? 't-green' : 't-red'} b">${e.before} → ${e.after}점</span></div>
      ${e.old != null ? `<div class="diff"><del>${esc(e.old)}</del><ins>${esc(e.fix)}</ins></div>` : ''}</li>`).join('')}</ul>
    ${edits.length > 6 ? `<p class="xs muted b" style="margin:0">최근 6건만 보여요</p>` : ''}
  </section>`;
}

function download(name, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name || '과제'}_수정본.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export default {
  render({ store, session }) {
    const r = session.ensureResult();
    if (!r) {
      return `${topbar()}<section class="card empty-state">${mascotTalk({ mood: 'quiz', small: true, html: '"고칠 과제가 아직 없어! 먼저 과제를 올려 줘."' })}<a class="btn green big" href="#/check">${icon('upload_file')}과제 제출하러 가기</a></section>${tabbar('editor')}`;
    }
    const { name } = player();
    const mobile = isMobile();
    const VIEWS = mobile ? MOBILE_VIEWS : DESKTOP_VIEWS;
    let view = session.editorView || (mobile ? 'doc' : 'split');
    if (!VIEWS[view]) view = mobile ? 'doc' : 'split';
    const input = session.input;
    const text = input.text;
    const issues = r.issues.filter(i => !session.ignored.has(keyOf(i, text)));
    const sel = issues.find(i => i.id === session.selected) || issues.find(i => i.severity === 'danger') || issues[0];
    const { html, paragraphs, passed } = renderLines(text, issues, session.selected && sel?.id);
    const dangers = issues.filter(i => i.severity === 'danger').length;
    const warnings = issues.length - dangers;
    const base = session.baseScore ?? r.score;
    const diff = r.score - base;
    const bulk = bulkFixable(issues);

    const docPane = `<section class="card pane-doc stack" aria-label="과제 본문">
      <div class="between"><h2 class="card-title">${icon('edit_note')}과제 본문 실시간 검토</h2><span class="chip blue xs">${paragraphs}문단 · 통과 ${passed}</span></div>
      ${session.editing
        ? `<label class="sr" for="doc-edit">원문 직접 수정</label><textarea id="doc-edit" rows="16">${esc(text)}</textarea>
           <div class="two"><button class="btn green" id="save-edit">${icon('check')}수정 완료</button><button class="btn" id="cancel-edit">취소</button></div>`
        : `${mobile ? `<p class="xs muted b" style="margin:0">${icon('touch_app')} 색칠된 부분을 누르면 고치는 방법이 나와요.</p>` : ''}<div class="lines">${html}</div>`}
    </section>`;

    const extras = `
      ${issues.length > 1 ? `<section class="card stack"><h2 class="card-title">${icon('list')}전체 수정 포인트 ${issues.length}건</h2>
        <div class="issue-list">${issues.map(i => `<button class="issue-row ${i.id === sel?.id ? 'on' : ''}" data-select="${i.id}"><span class="dot ${i.severity}"></span><span class="grow">${esc(i.title)}</span><span class="plus">+${i.gain}</span></button>`).join('')}</div>
      </section>` : ''}
      <section class="card tint tip">
        <div class="hero-avatar">${mascot(store.get().mascot, 'quiz', 56)}</div>
        <div><b>${esc(name)}의 특급 팁 💡</b>
          <p class="sm b" style="margin:4px 0 0">${dangers ? `위험 ${dangers}건만 바로잡아도 감점 구간을 크게 벗어나요. 지금 고치면 <b class="t-green">${r.potential.grade}</b>까지 가능해요!` : warnings ? `위험은 없어요! 주의 ${warnings}건을 다듬으면 완성도가 더 올라가요.` : '완벽해요! 마감 전에 한 번 더 읽어 보기만 하면 돼요.'}</p></div>
      </section>
      <section class="card live">
        <div><div class="sm muted b">${icon('rocket_launch')} 실시간 예측 성적</div>
          ${diff ? `<div class="was">${base}점</div>` : ''}<div class="now">${r.score}점 (${r.grade})</div></div>
        <div class="gain">성적 상승<b>${diff >= 0 ? '+' : ''}${diff}점</b></div>
      </section>
      ${historyCard(session.edits)}
      <div class="two"><button class="btn lilac big" id="download">${icon('download')}수정본 받기 (.txt)</button><button class="btn big" id="copy">${icon('content_copy')}전체 복사</button></div>
      <p class="xs muted b" style="margin:-4px 0 0">복사해서 한글·워드 원본에 붙여 넣으면 서식을 지키면서 고칠 수 있어요.</p>`;

    const empty = `<section class="card empty-state">${mascot(store.get().mascot, 'cheer', 110, 'bob')}<h2 class="h2">고칠 곳이 없어요!</h2><p class="muted b" style="margin:0">교수님 요구사항을 모두 지켰어요. 이대로 제출해도 좋아요.</p></section>`;
    const sidePane = `<div class="pane-side">${sel ? issueCard(sel, issues, input) : empty}${extras}</div>`;

    const showSheet = mobile && session.sheet && sel && view === 'doc' && !session.editing;
    const minibar = mobile && view === 'doc' && !session.editing && !showSheet
      ? `<div class="minibar" role="status"><span>${icon('rocket_launch')}</span><span><b>${r.score}점 ${r.grade}</b>${diff ? ` <span class="xs">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}<br><span class="xs">위험 ${dangers} · 주의 ${warnings}</span></span><button class="btn sm green" data-view="solution">수정 목록</button></div>`
      : '';

    return `${topbar()}
    <section class="card stack">
      <div class="doc-head">${icon('description', 'fill')}<h1>${esc(input.title || '제목 없는 과제')}</h1></div>
      ${bulk.length >= 2 ? `<button class="btn blue" id="bulk">${icon('bolt', 'fill')}원클릭 반영 · 맞춤법·형식 ${bulk.length}건</button>` : ''}
      <div class="counts"><span class="chip red"><span class="dot danger"></span>위험 ${dangers}</span><span class="chip orange"><span class="dot warning"></span>주의 ${warnings}</span><span class="chip blue"><span class="dot safe"></span>통과 ${passed}문단</span><span class="chip xs">${r.source === 'ai' ? 'AI 채점' : '기본 채점'}</span></div>
      ${mascotTalk({ mood: MOOD[r.mood], small: true, badge: false, tint: true, html: esc(r.message) })}
    </section>

    <div class="seg" role="tablist" aria-label="보기 방식">
      ${Object.entries(VIEWS).map(([id, [ic, label]]) => `<button role="tab" data-view="${id}" aria-selected="${view === id}" class="${view === id ? 'on' : ''}">${icon(ic)}${label}</button>`).join('')}
    </div>

    <div class="editor-grid">
      ${view !== 'solution' ? docPane : ''}
      ${view !== 'doc' ? sidePane : ''}
    </div>
    ${minibar}
    ${showSheet ? `<div class="sheet-wash" data-close></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="수정 방법">
        <div class="grip" aria-hidden="true"></div>
        <div class="between"><b>${icon('auto_fix_high')} 고치는 방법</b><button class="btn sm" data-close aria-label="닫기">${icon('close')}</button></div>
        ${issueCard(sel, issues, input)}
      </div>` : ''}
    ${tabbar('editor')}`;
  },

  mount(root, { session, rerender }) {
    if (!session.result) return;
    const mobile = isMobile();
    const text = () => session.input.text;
    const current = () => {
      const iss = session.result.issues.filter(i => !session.ignored.has(keyOf(i, text())));
      return iss.find(i => i.id === session.selected) || iss.find(i => i.severity === 'danger') || iss[0];
    };
    const select = id => {
      session.selected = id;
      const view = session.editorView || (mobile ? 'doc' : 'split');
      if (mobile && view === 'doc') session.sheet = true;
      else if (!mobile && view === 'doc') session.editorView = 'split';
      rerender();
      if (!session.sheet) root.querySelector('.issue-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    const closeSheet = () => { session.sheet = false; rerender(); };

    root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      session.editorView = b.dataset.view; session.sheet = false; rerender(); window.scrollTo(0, 0);
    }));
    root.querySelectorAll('mark.hl').forEach(m => {
      m.addEventListener('click', () => select(m.dataset.id));
      m.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(m.dataset.id); } });
    });
    root.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => select(b.dataset.select)));
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeSheet));

    root.querySelectorAll('[data-act="apply"]').forEach(b => b.addEventListener('click', () => {
      const issue = current();
      if (!issue) return;
      const before = session.result.score;
      const old = text().slice(issue.start, issue.end);
      const prev = text();
      const r = session.reanalyze(applyFix(text(), issue));
      session.edits = [...(session.edits || []), { title: issue.title, old: issue.start >= 0 ? old : null, fix: issue.fix, prev, before, after: r.score }];
      session.selected = null; session.sheet = false;
      toast(r.score > before ? `적용 완료! ${before} → ${r.score}점` : '적용 완료!');
      rerender();
    }));
    root.querySelectorAll('[data-act="ignore"]').forEach(b => b.addEventListener('click', () => {
      const issue = current();
      if (!issue) return;
      session.ignored.add(keyOf(issue, text()));
      session.selected = null; session.sheet = false;
      toast('이 항목은 목록에서 숨겼어요');
      rerender();
    }));
    root.querySelectorAll('[data-act="edit"]').forEach(b => b.addEventListener('click', () => {
      session.editing = true; session.sheet = false;
      session.editorView = mobile ? 'doc' : (session.editorView === 'solution' ? 'split' : session.editorView);
      rerender();
      const ta = root.querySelector('#doc-edit');
      if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); }
    }));
    root.querySelector('#save-edit')?.addEventListener('click', () => {
      const prev = text();
      const before = session.result.score;
      const r = session.reanalyze(root.querySelector('#doc-edit').value);
      if (prev !== text()) session.edits = [...(session.edits || []), { title: '직접 수정', old: null, prev, before, after: r.score }];
      session.editing = false; session.selected = null;
      rerender();
    });
    root.querySelector('#cancel-edit')?.addEventListener('click', () => { session.editing = false; rerender(); });
    root.querySelector('#download')?.addEventListener('click', () => download(session.input.title, text()));
    root.querySelector('#copy')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text()); toast('수정본 전체를 복사했어요'); }
      catch { toast('복사하지 못했어요. 다운로드를 이용해 주세요.'); }
    });
    root.querySelector('#bulk')?.addEventListener('click', () => {
      const shown = session.result.issues.filter(i => !session.ignored.has(keyOf(i, text())));
      const picked = bulkFixable(shown);
      if (!picked.length) return;
      const before = session.result.score;
      const prev = text();
      const r = session.reanalyze(applyMany(prev, picked));
      session.edits = [...(session.edits || []), { title: `한 번에 고치기 ${picked.length}건`, old: null, prev, before, after: r.score }];
      session.selected = null; session.sheet = false;
      toast(`${picked.length}건을 고쳤어요! ${before} → ${r.score}점`);
      rerender();
    });
    root.querySelector('#undo')?.addEventListener('click', () => {
      const last = session.edits?.[session.edits.length - 1];
      if (!last) return;
      session.edits = session.edits.slice(0, -1);
      session.reanalyze(last.prev);
      session.selected = null;
      toast(`되돌렸어요 (${last.title})`);
      rerender();
    });

    const onKey = e => { if (e.key === 'Escape' && session.sheet) closeSheet(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = session.sheet ? 'hidden' : '';
    root.querySelector('.sheet [data-close]')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  },
};
