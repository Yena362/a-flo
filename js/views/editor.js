// STEP 5. 교정 에디터: 문단별 실시간 검토(위험·주의 표시) + 감점 상세·추천 교정안·즉시 적용 + 실시간 예측 성적
import { topbar, tabbar, icon, esc, mascotTalk, toast, SEVERITY } from '../ui.js';
import { mascot } from '../mascot.js';
import { applyFix } from '../analyzer.js';

const VIEWS = { split: ['view_column', '2단 분할 뷰'], doc: ['article', '원문 집중'], solution: ['auto_fix_high', 'AI 솔루션'] };
const MOOD = { danger: 'danger', warning: 'quiz', safe: 'cheer' };
const keyOf = (i, text) => `${i.title}|${i.start >= 0 ? text.slice(i.start, i.end) : ''}`;

// 문단(줄) 단위로 하이라이트와 주석을 만든다. 겹치는 표시는 위험 > 주의, 앞선 것 우선
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
    const inLine = marks.filter(m => m.start < le && m.end > ls);
    let html = '', p = ls;
    for (const m of inLine) {
      const s = Math.max(m.start, ls), e = Math.min(m.end, le);
      html += esc(text.slice(p, s));
      html += `<mark class="hl ${m.severity} ${m.id === selectedId ? 'sel' : ''}" data-id="${m.id}" tabindex="0" role="button" aria-label="${SEVERITY[m.severity]}: ${esc(m.title)}">${esc(text.slice(s, e))}</mark>`;
      p = e;
    }
    html += esc(text.slice(p, le));
    const starts = issues.filter(i => i.start >= ls && i.start <= le);
    const worst = starts.some(i => i.severity === 'danger') ? 'danger' : starts.length ? 'warning' : '';
    if (!starts.length) passed++;
    const notes = starts.slice(0, 2).map(i => `<div class="note ${i.severity}">${icon(i.severity === 'danger' ? 'error' : 'warning', 'fill')}${SEVERITY[i.severity]}: ${esc(i.title)} (감점 예상 -${i.gain}점)${i.severity === 'danger' ? `<button class="fixit" data-select="${i.id}">수정 필요</button>` : ''}</div>`).join('');
    out.push(`<div class="line ${worst ? `has-${worst}` : ''}"><span class="no">${no}</span><div><div class="tx">${html}</div>${notes}</div></div>`);
  }
  return { html: out.join(''), paragraphs: no, passed };
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
    const text = session.input.text;
    const issues = r.issues.filter(i => !session.ignored.has(keyOf(i, text)));
    const view = session.editorView || 'split';
    const sel = issues.find(i => i.id === session.selected) || issues.find(i => i.severity === 'danger') || issues[0];
    const { html, paragraphs, passed } = renderLines(text, issues, sel?.id);
    const dangers = issues.filter(i => i.severity === 'danger').length;
    const warnings = issues.length - dangers;
    const base = session.baseScore ?? r.score;
    const n = sel ? issues.filter(i => i.severity === sel.severity).indexOf(sel) + 1 : 0;
    const editing = session.editing;

    const docPane = `<section class="card pane-doc stack" aria-label="과제 본문">
      <div class="between wrap"><h2 class="card-title">${icon('edit_note')}과제 본문 실시간 검토</h2><span class="chip blue xs">${paragraphs}개 문단 · 통과 ${passed}</span></div>
      ${editing
        ? `<label class="sr" for="doc-edit">원문 직접 수정</label><textarea id="doc-edit" rows="18">${esc(text)}</textarea>
           <div class="row wrap"><button class="btn green" id="save-edit">${icon('check')}수정 완료 · 다시 채점</button><button class="btn" id="cancel-edit">취소</button></div>`
        : `<div class="lines">${html}</div>`}
    </section>`;

    const sidePane = `<div class="pane-side">
      ${sel ? `<section class="card issue-card" aria-live="polite">
        <div class="between" style="align-items:flex-start"><h2 class="issue-title ${sel.severity}">${icon(sel.severity === 'danger' ? 'error' : 'warning', 'fill')}${SEVERITY[sel.severity]} ${n}: ${esc(sel.title)}</h2><span class="chip ${sel.severity === 'danger' ? 'red' : 'yellow'}">-${sel.gain}점 방어</span></div>
        <div class="box prof"><div class="label">${icon('campaign')}${sel.category === 'instruction' && session.input.instructions ? '교수님 지시' : '감점 이유'}</div>
          ${sel.category === 'instruction' && session.input.instructions ? `<p class="b" style="margin:0 0 6px">"${esc(session.input.instructions)}"</p>` : ''}
          <p style="margin:0">${esc(sel.reason)}</p></div>
        <div class="box fix"><div class="between"><div class="label">${icon('auto_fix_high')}A-Flo 추천 교정안</div>${sel.source === 'ai' ? '<span class="chip green xs">AI 제안</span>' : ''}</div>
          ${sel.start >= 0 ? `<p class="old">${esc(text.slice(sel.start, sel.end))}</p>` : ''}
          <p class="new">${esc(sel.fix != null ? sel.fix : sel.suggestion)}</p>
          ${sel.fix != null && sel.suggestion && sel.suggestion !== sel.fix ? `<p class="sm muted b" style="margin:8px 0 0">${esc(sel.suggestion)}</p>` : ''}
        </div>
        ${sel.fix != null ? `<button class="btn blue big" id="apply">✨ 추천 수정안 원문에 즉시 적용</button>` : `<p class="sm muted b" style="margin:0">${icon('info')} 이 항목은 직접 고쳐야 해요. 아래 "직접 텍스트 수정"을 눌러 주세요.</p>`}
        <div class="two">
          <button class="btn sm" id="ignore">${icon('visibility_off')}이 항목 무시</button>
          <button class="btn sm" id="edit">${icon('edit')}직접 텍스트 수정</button>
        </div>
      </section>` : `<section class="card empty-state">${mascot(store.get().mascot, 'cheer', 110, 'bob')}<h2 class="h2">고칠 곳이 없어요!</h2><p class="muted b" style="margin:0">교수님 요구사항을 모두 지켰어요. 이대로 제출해도 좋아요.</p></section>`}

      ${issues.length > 1 ? `<section class="card stack"><h2 class="card-title">${icon('list')}전체 수정 포인트 ${issues.length}건</h2>
        <div class="issue-list">${issues.map(i => `<button class="issue-row ${i.id === sel?.id ? 'on' : ''}" data-select="${i.id}"><span class="dot ${i.severity}"></span><span class="grow">${esc(i.title)}</span><span class="plus">+${i.gain}</span></button>`).join('')}</div>
      </section>` : ''}

      <section class="card tint tip">
        <div class="hero-avatar">${mascot(store.get().mascot, 'quiz', 56)}</div>
        <div><b>${esc(store.get().mascot === 'chick' ? '삐약이' : '코치')}의 특급 팁 💡</b>
          <p class="sm b" style="margin:4px 0 0">${dangers ? `위험 ${dangers}건만 바로잡아도 감점 구간을 크게 벗어나요. 지금 고치면 <b class="t-green">${r.potential.grade}</b>까지 가능해요!` : warnings ? `위험은 없어요! 주의 ${warnings}건을 다듬으면 완성도가 더 올라가요.` : '완벽해요! 마감 전에 한 번 더 읽어 보기만 하면 돼요.'}</p></div>
      </section>

      <section class="card live">
        <div><div class="sm muted b">${icon('rocket_launch')} 실시간 예측 성적</div>
          ${base !== r.score ? `<div class="was">${base}점</div>` : ''}<div class="now">${r.score}점 (${r.grade})</div></div>
        <div class="gain">성적 상승<b>${r.score - base >= 0 ? '+' : ''}${r.score - base}점</b></div>
      </section>
      <button class="btn lilac big" id="download">${icon('download')}수정본 다운로드 (.txt)</button>
    </div>`;

    return `${topbar()}
    <section class="card stack">
      <div class="doc-head">${icon('description', 'fill')}<h1>${esc(session.input.title || '제목 없는 과제')}</h1><span class="chip blue xs">${r.source === 'ai' ? 'AI 채점' : '기본 채점'}</span></div>
      <div class="counts"><span class="chip red"><span class="dot danger"></span>위험 ${dangers}건</span><span class="chip orange"><span class="dot warning"></span>주의 ${warnings}건</span><span class="chip blue"><span class="dot safe"></span>통과 ${passed}문단</span></div>
      ${mascotTalk({ mood: MOOD[r.mood], small: true, badge: false, tint: true, html: esc(r.message) })}
    </section>

    <div class="seg" role="tablist" aria-label="보기 방식">
      ${Object.entries(VIEWS).map(([id, [ic, label]]) => `<button role="tab" data-view="${id}" aria-selected="${view === id}" class="${view === id ? 'on' : ''}">${icon(ic)}${label}</button>`).join('')}
    </div>

    <div class="editor-grid">
      ${view !== 'solution' ? docPane : ''}
      ${view !== 'doc' ? sidePane : ''}
    </div>
    ${tabbar('editor')}`;
  },

  mount(root, { session, rerender }) {
    if (!session.result) return;
    const text = () => session.input.text;
    const select = id => {
      session.selected = id;
      if (session.editorView === 'doc') session.editorView = 'split';
      rerender();
      root.querySelector('.issue-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { session.editorView = b.dataset.view; rerender(); }));
    root.querySelectorAll('mark.hl').forEach(m => {
      m.addEventListener('click', () => select(m.dataset.id));
      m.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(m.dataset.id); } });
    });
    root.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => select(b.dataset.select)));

    const current = () => {
      const iss = session.result.issues.filter(i => !session.ignored.has(keyOf(i, text())));
      return iss.find(i => i.id === session.selected) || iss.find(i => i.severity === 'danger') || iss[0];
    };
    root.querySelector('#apply')?.addEventListener('click', () => {
      const issue = current();
      if (!issue) return;
      const before = session.result.score;
      const r = session.reanalyze(applyFix(text(), issue));
      session.selected = null;
      toast(r.score > before ? `적용 완료! ${before} → ${r.score}점` : '적용 완료!');
      rerender();
    });
    root.querySelector('#ignore')?.addEventListener('click', () => {
      const issue = current();
      if (!issue) return;
      session.ignored.add(keyOf(issue, text()));
      session.selected = null;
      toast('이 항목은 목록에서 숨겼어요');
      rerender();
    });
    root.querySelector('#edit')?.addEventListener('click', () => {
      session.editing = true;
      if (session.editorView === 'solution') session.editorView = 'split';
      rerender();
      root.querySelector('#doc-edit')?.focus();
    });
    root.querySelector('#save-edit')?.addEventListener('click', () => {
      session.reanalyze(root.querySelector('#doc-edit').value);
      session.editing = false;
      session.selected = null;
      rerender();
    });
    root.querySelector('#cancel-edit')?.addEventListener('click', () => { session.editing = false; rerender(); });
    root.querySelector('#download')?.addEventListener('click', () => download(session.input.title, text()));
  },
};
