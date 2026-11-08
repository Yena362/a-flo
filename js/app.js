// 화면 전환(해시 라우터). 화면을 추가하려면 views/ 에 파일을 만들고 아래 routes에 등록하세요.
// 첫 화면은 과제 검사. 하단 탭: 과제 검사(분석 진행 포함) · 점수 진단 · 교정 · 퀴즈(홈) · 노트북  (+ 마이)
import * as store from './store.js';
import { initCloud } from './cloud.js';
import { analyze } from './analyzer.js';
import { reapply } from './ai.js';
import { initA11y } from './a11y.js';
import home from './views/home.js';
import check from './views/check.js';
import result from './views/result.js';
import editor from './views/editor.js';
import my from './views/my.js';
import notebook from './views/notebook.js';
import premium from './views/premium.js';

const routes = { home, check, result, editor, my, notebook, premium };
const ALIASES = { quiz: 'home', loading: 'check' }; // 예전 주소 호환

// 화면 사이에서 공유하는 현재 검사 상태
const session = {
  input: null,
  result: null,
  ai: null,          // 마지막 Gemini 응답 (수정안 적용 후 재호출 없이 재사용)
  aiError: null,
  baseScore: null,   // 처음 검사했을 때 점수 (교정 후 상승폭 표시용)
  ignored: new Set(),
  edits: [],         // 교정 에디터 수정 기록 [{ title, old, fix, prev, before, after }] (되돌리기용)
  ensureResult() {
    if (!this.input && store.get().draft) this.input = store.get().draft;
    if (!this.input?.text?.trim()) return null; // 파일을 지웠거나 아직 올리지 않음
    if (this.input && !this.result) this.result = this.ai ? reapply(this.input, this.ai) : analyze(this.input);
    if (this.result && this.baseScore == null) this.baseScore = this.result.score;
    return this.result;
  },
  reanalyze(text) {
    this.input = { ...this.input, text };
    store.set({ draft: this.input });
    this.result = this.ai ? reapply(this.input, this.ai) : analyze(this.input);
    return this.result;
  },
};

function parse() {
  const [raw, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const path = ALIASES[raw] || raw;
  return { name: routes[path] ? path : 'check', params: new URLSearchParams(query) };
}

let cleanup = null;

function render({ keepScroll = false } = {}) {
  const { name, params } = parse();
  const view = routes[name];
  const root = document.getElementById('app');
  const y = window.scrollY;
  if (cleanup) { cleanup(); cleanup = null; }
  const ctx = { store, session, params, go: r => { location.hash = `#/${r}`; }, rerender: () => render({ keepScroll: true }) };
  root.className = `view view-${name}`;
  root.innerHTML = view.render(ctx);
  cleanup = view.mount ? view.mount(root, ctx) || null : null;
  window.scrollTo(0, keepScroll ? y : 0);
  const h = root.querySelector('h1, h2')?.cloneNode(true);
  h?.querySelectorAll('.ms').forEach(n => n.remove()); // 아이콘 글자는 제목에서 빼기
  document.title = h ? `${h.textContent.trim()} · 에이플로` : '에이플로';
}

window.addEventListener('hashchange', () => render());
initA11y();
render();

// 로그인 상태가 바뀌거나 클라우드 기록을 받아오면 기록을 보여 주는 화면만 다시 그려요.
// (과제를 검사하거나 교정하는 중인 화면은 건드리지 않아요)
initCloud(() => {
  if (['my', 'home', 'premium'].includes(parse().name)) render({ keepScroll: true });
}).catch(() => { /* 로그인 기능이 안 돼도 앱은 기기 저장으로 계속 동작해요 */ });
