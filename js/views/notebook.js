// 프리미엄: 자료 노트북 + 시험 대비 팩
//   - 강의자료(HWP·PDF·DOCX·TXT·붙여넣기)를 최대 10개까지 올림
//   - 질문하기: 올린 자료로만 답하고, 근거 문장(출처)을 함께 보여 줌
//   - 시험 대비 팩: 요약 노트 · 예상 문제 · 암기 카드 · 개념 지도
import { topbar, tabbar, icon, esc, toast, mascotTalk } from '../ui.js';
import { mascot } from '../mascot.js';
import { isPremium } from '../plan.js';
import { readAssignmentFile } from '../docx.js';
import { study, loadNotebook, saveNotebook, sourcesKey, MAX_SOURCES, MAX_SOURCES_TEXT } from '../study.js';

const TOOLS = {
  ask: ['forum', '질문하기'],
  summary: ['summarize', '요약 노트'],
  quiz: ['quiz', '예상 문제'],
  cards: ['style', '암기 카드'],
  map: ['account_tree', '개념 지도'],
};
const LETTERS = ['A', 'B', 'C', 'D'];
const chars = s => s.replace(/\s+/g, ' ').trim().length;

function srcChip(sources, n) {
  const s = sources[n - 1];
  return s ? `<span class="chip blue xs" title="${esc(s.name)}">${icon('description')}자료${n}</span>` : '';
}

function locked(store) {
  return `${topbar()}
  ${mascotTalk({ mood: 'quiz', html: '"강의자료를 올리면 내 자료로만 답해 주고, 시험 대비 자료까지 만들어 줄게! 프리미엄 기능이야."' })}
  <section class="card tint stack">
    <div class="row wrap"><span class="chip ink">${icon('workspace_premium', 'fill')}PREMIUM</span></div>
    <h1 class="h2">자료 노트북 · 시험 대비 팩</h1>
    <ul class="checklist">
      ${['강의 PDF·한글·워드 파일을 최대 10개까지 올려요', '질문하면 올린 자료에서만 찾아 답하고 근거 문장을 보여 줘요', '요약 노트 · 예상 문제 · 암기 카드 · 개념 지도를 한 번에 만들어요'].map(t => `<li class="met">${icon('check_circle', 'fill')}<b>${t}</b></li>`).join('')}
    </ul>
    <a class="btn orange big" href="#/premium">${icon('workspace_premium', 'fill')}프리미엄 알아보기</a>
  </section>
  ${tabbar('notebook')}`;
}

function sourcesCard(nb, session) {
  const total = nb.sources.reduce((n, s) => n + s.text.length, 0);
  return `<section class="card stack">
    <div class="between"><h2 class="card-title">${icon('folder_open')}학습 자료</h2><span class="chip xs">${nb.sources.length}/${MAX_SOURCES} · ${total.toLocaleString()}자</span></div>
    ${nb.sources.length ? `<ul class="src-list">${nb.sources.map((s, i) => `<li>
      <span class="src-no">${i + 1}</span>
      <span class="grow"><b class="ellipsis">${esc(s.name)}</b><span class="xs muted b">${chars(s.text).toLocaleString()}자</span></span>
      <button class="btn sm icon-btn" data-del-src="${s.id}" aria-label="${esc(s.name)} 삭제">${icon('delete')}</button>
    </li>`).join('')}</ul>` : '<p class="sm muted b" style="margin:0">강의 PDF, 한글(HWP), 워드 파일이나 필기 내용을 올려 주세요.</p>'}
    <div id="nb-status">${session.nbReading ? `<div class="file busy">${icon('progress_activity', 'spin')}<div class="grow"><b>${esc(session.nbReading)}</b></div></div>` : ''}</div>
    <div class="two">
      <label class="btn sm" for="nb-file">${icon('add')}파일 추가</label>
      <button class="btn sm" id="nb-paste-toggle">${icon('content_paste')}텍스트 붙여넣기</button>
    </div>
    <input type="file" id="nb-file" class="sr" multiple accept=".hwp,.hwpx,.pdf,.docx,.txt,.md,application/pdf,text/plain">
    ${session.nbPaste ? `<div class="stack" style="gap:8px">
      <input type="text" id="nb-paste-name" placeholder="자료 이름 (예: 3주차 필기)">
      <textarea id="nb-paste-text" rows="5" placeholder="필기·강의 내용을 붙여 넣으세요."></textarea>
      <button class="btn green" id="nb-paste-add">${icon('add')}자료로 추가</button>
    </div>` : ''}
    <p class="xs muted b" style="margin:0">전체 ${MAX_SOURCES_TEXT.toLocaleString()}자까지 · 올린 자료는 이 기기에만 보관돼요</p>
  </section>`;
}

function askPanel(nb, session, mk) {
  return `<section class="stack" style="gap:12px">
    ${nb.chat.length ? nb.chat.map(c => `<div class="chat-q"><span>${esc(c.q)}</span></div>
      <section class="card stack chat-a">
        ${c.a.found === false ? `<span class="chip yellow xs">${icon('search_off')}자료에서 찾지 못함</span>` : ''}
        <p style="margin:0;white-space:pre-wrap">${esc(c.a.answer)}</p>
        ${c.a.citations?.length ? `<details class="cites"><summary>${icon('format_quote')}근거 ${c.a.citations.length}개 보기</summary>
          <ul>${c.a.citations.map(ct => `<li>${srcChip(nb.sources, ct.source)}<span>"${esc(ct.quote)}"</span></li>`).join('')}</ul></details>` : ''}
      </section>`).join('')
      : `<section class="card tint stack"><b>${icon('lightbulb')} 이렇게 물어보세요</b>
        <div class="chips-wrap">${['이 단원에서 시험에 꼭 나올 개념은?', '두 이론의 차이를 비교해 줘', '핵심 공식을 예시와 함께 설명해 줘'].map(q => `<button class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>`}
    ${nb.chat.at(-1)?.a.followUps?.length ? `<div class="chips-wrap">${nb.chat.at(-1).a.followUps.slice(0, 3).map(q => `<button class="chip green" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
    ${session.nbBusy === 'ask' ? `<div class="row muted b">${mascot(mk, 'analyzing', 40, 'bob')}자료를 찾아보는 중…</div>` : ''}
    <form class="ask-bar" id="ask-form">
      <label class="sr" for="ask-input">질문</label>
      <textarea id="ask-input" rows="1" placeholder="자료에 대해 질문해 보세요" ${session.nbBusy ? 'disabled' : ''}></textarea>
      <button class="btn green" type="submit" aria-label="질문 보내기" ${session.nbBusy ? 'disabled' : ''}>${icon('send', 'fill')}</button>
    </form>
    ${nb.chat.length ? '<button class="link sm" id="clear-chat">대화 지우기</button>' : ''}
  </section>`;
}

function renderResult(tool, data, nb, session) {
  if (tool === 'summary') {
    return `<section class="card stack"><h2 class="h2">${esc(data.title)}</h2><p class="b" style="margin:0">${esc(data.overview)}</p></section>
      ${data.sections.map(sec => `<section class="card stack"><div class="between"><h3 class="h3">${esc(sec.heading)}</h3>${srcChip(nb.sources, sec.source)}</div>
        <ul class="points">${sec.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}
      ${data.keyTerms?.length ? `<section class="card tint stack"><h3 class="card-title">${icon('key')}꼭 외울 용어</h3>
        <dl class="terms">${data.keyTerms.map(t => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.meaning)}</dd></div>`).join('')}</dl></section>` : ''}`;
  }
  if (tool === 'quiz') {
    const picks = session.nbQuiz || {};
    const done = Object.keys(picks).length;
    const right = data.questions.filter((q, i) => picks[i] === q.answer).length;
    return `<div class="between"><span class="chip blue">${icon('quiz')}${data.questions.length}문제</span>${done ? `<span class="chip green">맞힌 문제 ${right}/${done}</span>` : ''}</div>
      ${data.questions.map((q, i) => {
        const picked = picks[i];
        return `<section class="card quiz stack"><div class="between"><span class="chip xs">Q${i + 1}</span>${srcChip(nb.sources, q.source)}</div>
          <h3 class="h3">${esc(q.q)}</h3>
          <div class="options">${q.options.map((o, k) => {
            const cls = picked == null ? '' : k === q.answer ? 'right' : k === picked ? 'wrong' : '';
            return `<button class="option ${cls}" data-q="${i}" data-k="${k}" ${picked != null ? 'disabled' : ''}><span class="letter">${picked != null && k === q.answer ? icon('check', 'fill') : LETTERS[k]}</span><span>${esc(o)}</span></button>`;
          }).join('')}</div>
          ${picked != null ? `<div class="explain ${picked === q.answer ? 'safe' : 'danger'}"><b>${picked === q.answer ? '정답!' : `정답은 ${LETTERS[q.answer]}`}</b><p>${esc(q.explain)}</p></div>` : ''}
        </section>`;
      }).join('')}`;
  }
  if (tool === 'cards') {
    const i = Math.min(session.nbCard || 0, data.cards.length - 1);
    const c = data.cards[i];
    return `<section class="stack" style="gap:12px">
      <button class="flash ${session.nbFlip ? 'back' : ''}" id="flip" aria-label="카드 뒤집기">
        <span class="xs b muted">${session.nbFlip ? '뒷면 · 설명' : '앞면 · 개념'} ${srcChip(nb.sources, c.source)}</span>
        <span class="flash-text">${esc(session.nbFlip ? c.back : c.front)}</span>
        <span class="xs muted b">${icon('touch_app')} 눌러서 뒤집기</span>
      </button>
      <div class="between"><button class="btn sm" id="prev-card" ${i === 0 ? 'disabled' : ''}>${icon('chevron_left')}이전</button><b>${i + 1} / ${data.cards.length}</b><button class="btn sm green" id="next-card" ${i === data.cards.length - 1 ? 'disabled' : ''}>다음${icon('chevron_right')}</button></div>
    </section>`;
  }
  if (tool === 'map') {
    return `<section class="card stack"><div class="map-root">${icon('hub')}${esc(data.root)}</div>
      <ul class="map">${data.branches.map((b, bi) => `<li class="b${bi % 4}"><b>${esc(b.label)}</b>
        ${b.children?.length ? `<ul>${b.children.map(c => `<li>${esc(c.label)}${c.children?.length ? `<ul>${c.children.map(g => `<li>${esc(g.label)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul></section>`;
  }
  return '';
}

function toolPanel(tool, nb, session, mk) {
  if (tool === 'ask') return askPanel(nb, session, mk);
  const key = sourcesKey(nb.sources);
  const cached = nb.results?.[tool];
  const fresh = cached && cached.key === key;
  const busy = session.nbBusy === tool;
  return `<section class="stack" style="gap:12px">
    ${busy ? `<section class="card tint row">${mascot(mk, 'analyzing', 64, 'bob')}<div><b>${TOOLS[tool][1]} 만드는 중…</b><div class="sm muted b">자료가 많으면 30초 정도 걸려요</div></div></section>` : ''}
    ${!busy && cached ? `${!fresh ? `<p class="sm b t-orange" style="margin:0">${icon('info')} 자료가 바뀌었어요. 새로 만들면 반영돼요.</p>` : ''}${renderResult(tool, cached.data, nb, session)}` : ''}
    ${!busy ? `<button class="btn ${cached ? '' : 'green big'}" id="make">${icon(cached ? 'refresh' : 'auto_awesome')}${cached ? '다시 만들기' : `${TOOLS[tool][1]} 만들기`}</button>` : ''}
  </section>`;
}

export default {
  render({ store, session }) {
    if (!isPremium()) return locked(store);
    const nb = loadNotebook();
    const tool = session.nbTool || 'ask';
    return `${topbar()}
    <section class="card tint stack">
      <div class="row wrap"><span class="chip ink">${icon('workspace_premium', 'fill')}PREMIUM</span></div>
      <h1 class="h2">자료 노트북 · 시험 대비 팩</h1>
      <p class="sm muted b" style="margin:0">내 강의자료로만 답하고, 시험 대비 자료를 만들어 드려요.</p>
    </section>
    ${sourcesCard(nb, session)}
    ${nb.sources.length ? `<div class="tools" role="tablist" aria-label="학습 도구">
      ${Object.entries(TOOLS).map(([id, [ic, label]]) => `<button role="tab" class="tool ${tool === id ? 'on' : ''}" aria-selected="${tool === id}" data-tool="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}
    </div>
    ${session.nbError ? `<p class="explain danger" style="margin:0"><b>${icon('error')} ${esc(session.nbError)}</b></p>` : ''}
    ${toolPanel(tool, nb, session, store.get().mascot)}` : ''}
    ${tabbar('notebook')}`;
  },

  mount(root, { session, rerender }) {
    if (!isPremium()) return;
    const nb = () => loadNotebook();
    const persist = patch => { if (!saveNotebook(patch)) toast('기기 저장 공간이 부족해요. 이번 방문 동안만 보관돼요.'); };
    const total = () => nb().sources.reduce((n, s) => n + s.text.length, 0);

    const addSource = (name, text) => {
      const body = text.trim();
      if (body.replace(/\s/g, '').length < 20) { toast(`${name}: 읽을 수 있는 글자가 거의 없어요`); return false; }
      if (nb().sources.length >= MAX_SOURCES) { toast(`자료는 ${MAX_SOURCES}개까지 넣을 수 있어요`); return false; }
      if (total() + body.length > MAX_SOURCES_TEXT) { toast(`전체 ${MAX_SOURCES_TEXT.toLocaleString()}자를 넘어요. 다른 자료를 지우고 넣어 주세요.`); return false; }
      persist({ sources: [...nb().sources, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, text: body, addedAt: Date.now() }] });
      return true;
    };

    root.querySelector('#nb-file')?.addEventListener('change', async e => {
      const files = [...e.target.files];
      e.target.value = '';
      let added = 0;
      for (const f of files) {
        session.nbReading = `${f.name} 읽는 중…`; rerender();
        try {
          const text = await readAssignmentFile(f, msg => { const el = document.querySelector('#nb-status b'); if (el) el.textContent = `${f.name} · ${msg}`; });
          if (addSource(f.name, text)) added++;
        } catch (err) { toast(`${f.name}: ${err.message}`); }
      }
      session.nbReading = null; session.nbError = null;
      rerender();
      if (added) toast(`자료 ${added}개를 추가했어요`);
    });
    root.querySelector('#nb-paste-toggle')?.addEventListener('click', () => { session.nbPaste = !session.nbPaste; rerender(); });
    root.querySelector('#nb-paste-add')?.addEventListener('click', () => {
      const name = root.querySelector('#nb-paste-name').value.trim() || `필기 ${nb().sources.length + 1}`;
      if (addSource(name, root.querySelector('#nb-paste-text').value)) { session.nbPaste = false; rerender(); toast('자료를 추가했어요'); }
    });
    root.querySelectorAll('[data-del-src]').forEach(b => b.addEventListener('click', () => {
      const gone = nb().sources.find(s => s.id === b.dataset.delSrc);
      persist({ sources: nb().sources.filter(s => s.id !== b.dataset.delSrc) });
      toast(`'${gone?.name}' 자료를 지웠어요`);
      rerender();
    }));

    root.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { session.nbTool = b.dataset.tool; session.nbError = null; rerender(); }));

    const run = async (tool, extra = {}) => {
      session.nbBusy = tool; session.nbError = null; rerender();
      try {
        const data = await study(tool, { sources: nb().sources, ...extra });
        if (tool === 'ask') persist({ chat: [...nb().chat, { q: extra.question, a: data }].slice(-20) });
        else {
          persist({ results: { ...nb().results, [tool]: { key: sourcesKey(nb().sources), data, at: Date.now() } } });
          if (tool === 'quiz') session.nbQuiz = {};
          if (tool === 'cards') { session.nbCard = 0; session.nbFlip = false; }
        }
      } catch (err) {
        session.nbError = err.message;
      } finally {
        session.nbBusy = null;
        if (location.hash.startsWith('#/notebook')) rerender();
      }
    };

    const ask = q => {
      const question = q.trim();
      if (!question || session.nbBusy) return;
      run('ask', { question, history: nb().chat.slice(-4).map(c => ({ q: c.q, a: c.a.answer })) });
    };
    root.querySelector('#ask-form')?.addEventListener('submit', e => { e.preventDefault(); ask(root.querySelector('#ask-input').value); });
    root.querySelector('#ask-input')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(e.target.value); } });
    root.querySelectorAll('[data-ask]').forEach(b => b.addEventListener('click', () => ask(b.dataset.ask)));
    root.querySelector('#clear-chat')?.addEventListener('click', () => { persist({ chat: [] }); rerender(); });

    root.querySelector('#make')?.addEventListener('click', () => run(session.nbTool || 'ask'));
    root.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      session.nbQuiz = { ...(session.nbQuiz || {}), [b.dataset.q]: Number(b.dataset.k) };
      rerender();
    }));
    root.querySelector('#flip')?.addEventListener('click', () => { session.nbFlip = !session.nbFlip; rerender(); });
    root.querySelector('#prev-card')?.addEventListener('click', () => { session.nbCard = Math.max(0, (session.nbCard || 0) - 1); session.nbFlip = false; rerender(); });
    root.querySelector('#next-card')?.addEventListener('click', () => { session.nbCard = (session.nbCard || 0) + 1; session.nbFlip = false; rerender(); });
  },
};
