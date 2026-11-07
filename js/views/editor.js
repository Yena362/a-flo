// STEP 5. 2단 분할 교정 에디터: 왼쪽 원문 하이라이트, 오른쪽 피드백 + [원문 자동 적용]
import { esc, SEVERITY, toast } from '../ui.js';
import { applyFix } from '../analyzer.js';

// 겹치지 않는 범위만 하이라이트 (겹치면 위험 > 주의, 먼저 나온 것 우선)
function highlight(text, issues) {
  const marks = issues.filter(i => i.start >= 0)
    .sort((a, b) => a.start - b.start || (a.severity === 'danger' ? -1 : 1));
  let out = '', pos = 0;
  const shown = new Set();
  for (const i of marks) {
    if (i.start < pos) continue;
    out += esc(text.slice(pos, i.start));
    out += `<mark class="hl ${i.severity}" data-id="${i.id}" tabindex="0" role="button" aria-label="${SEVERITY[i.severity]}: ${esc(i.title)}">${esc(text.slice(i.start, i.end))}</mark>`;
    pos = i.end;
    shown.add(i.id);
  }
  return { html: out + esc(text.slice(pos)), shown };
}

function issueCard(i, text, selected) {
  const head = `<span class="sev ${i.severity}">${SEVERITY[i.severity]}</span><b>${esc(i.title)}</b><span class="plus small">+${i.gain}</span>`;
  return `<article class="issue ${i.severity} ${selected ? 'selected' : ''}" data-id="${i.id}">
    ${selected ? `<header>${head}</header>` : `<button class="issue-head" data-select="${i.id}" aria-expanded="false">${head}</button>`}
    ${selected ? `
      <p>${esc(i.reason)}</p>
      ${i.start >= 0 ? `<div class="diff"><span class="small muted">원문</span><p class="old">${esc(text.slice(i.start, i.end))}</p></div>` : ''}
      <div class="diff"><span class="small muted">${i.fix != null ? 'AI 추천 수정안' : '이렇게 고쳐 보세요'}</span><p class="new">${esc(i.fix != null ? i.fix : i.suggestion)}</p></div>
      ${i.fix != null && i.suggestion !== i.fix ? `<p class="small muted">${esc(i.suggestion)}</p>` : ''}
      <div class="row gap">
        ${i.fix != null ? `<button class="btn primary" data-apply="${i.id}">원문 자동 적용</button>` : ''}
        ${i.start >= 0 ? `<button class="btn" data-goto="${i.id}">본문에서 보기</button>` : ''}
      </div>` : ''}
  </article>`;
}

export default {
  render({ session }) {
    const r = session.ensureResult();
    if (!r) return '<section class="card stack"><p>아직 검사한 과제가 없어요.</p><a class="btn primary" href="#/check">과제 검사하러 가기</a></section>';
    const text = session.input.text;
    const sel = session.selected && r.issues.find(i => i.id === session.selected) ? session.selected : r.issues[0]?.id;
    const { html } = highlight(text, r.issues);
    return `<header class="editor-bar">
      <a class="btn-icon" href="#/result" aria-label="결과로 돌아가기"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></a>
      <h1 class="h3 grow">교정 에디터</h1>
      <span class="score-mini">${r.score}점 <b>${r.grade}</b></span>
    </header>
    <div class="editor">
      <section class="pane pane-doc" aria-label="원문">
        <div class="pane-head row-between">
          <span class="small"><span class="legend danger"></span>위험 <span class="legend warning"></span>주의</span>
          <span class="row gap">
            <button class="btn small-btn" id="edit-toggle">직접 수정</button>
            <button class="btn small-btn" id="copy">복사</button>
          </span>
        </div>
        <div class="doc" id="doc">${html}</div>
        <textarea class="doc doc-edit" id="doc-edit" hidden aria-label="원문 직접 수정">${esc(text)}</textarea>
      </section>
      <section class="pane pane-feedback" aria-label="피드백">
        <div class="pane-head"><b>피드백 ${r.issues.length}개</b></div>
        ${r.issues.length ? r.issues.map(i => issueCard(i, text, i.id === sel)).join('') : '<p class="empty">고칠 곳이 없어요. 이대로 제출해도 좋아요!</p>'}
      </section>
    </div>`;
  },

  mount(root, { session, rerender }) {
    if (!session.result) return;
    const select = id => { session.selected = id; rerender(); };
    root.querySelectorAll('mark.hl').forEach(m => {
      const pick = () => select(m.dataset.id);
      m.addEventListener('click', pick);
      m.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    root.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => select(b.dataset.select)));
    root.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
      const m = root.querySelector(`mark[data-id="${b.dataset.goto}"]`);
      if (m) { m.scrollIntoView({ behavior: 'smooth', block: 'center' }); m.focus(); }
      else toast('다른 표시와 겹쳐 있어요. 앞의 항목을 먼저 고쳐 주세요.');
    }));
    root.querySelectorAll('[data-apply]').forEach(b => b.addEventListener('click', () => {
      const issue = session.result.issues.find(i => i.id === b.dataset.apply);
      const before = session.result.score;
      const r = session.reanalyze(applyFix(session.input.text, issue));
      session.selected = null;
      toast(r.score > before ? `적용 완료! ${before} → ${r.score}점` : '적용 완료!');
      rerender();
    }));

    const doc = root.querySelector('#doc');
    const edit = root.querySelector('#doc-edit');
    const toggle = root.querySelector('#edit-toggle');
    toggle.addEventListener('click', () => {
      if (edit.hidden) {
        edit.hidden = false; doc.hidden = true; toggle.textContent = '수정 완료 · 다시 분석'; edit.focus();
      } else {
        session.reanalyze(edit.value);
        session.selected = null;
        rerender();
      }
    });
    root.querySelector('#copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(session.input.text); toast('본문을 복사했어요'); }
      catch { toast('복사하지 못했어요. 직접 수정 모드에서 선택해 복사해 주세요.'); }
    });
  },
};
