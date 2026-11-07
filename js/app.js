// 화면 전환(해시 라우터). 화면을 추가하려면 views/ 에 파일을 만들고 아래 routes에 등록하세요.
import * as store from './store.js';
import { analyze } from './analyzer.js';
import { reapply } from './ai.js';
import home from './views/home.js';
import quiz from './views/quiz.js';
import check from './views/check.js';
import loading from './views/loading.js';
import result from './views/result.js';
import editor from './views/editor.js';
import my from './views/my.js';

const routes = { home, quiz, check, loading, result, editor, my };

// 화면 사이에서 공유하는 현재 검사 상태
const session = {
  input: null,
  result: null,
  ai: null, // 마지막 Gemini 응답 (수정안 적용 후 재호출 없이 재사용)
  aiError: null,
  ensureResult() {
    if (!this.input && store.get().draft) this.input = store.get().draft;
    if (this.input && !this.result) this.result = this.ai ? reapply(this.input, this.ai) : analyze(this.input);
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
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return { name: routes[path] ? path : 'home', params: new URLSearchParams(query) };
}

let cleanup = null;

function render() {
  const { name, params } = parse();
  const view = routes[name];
  const root = document.getElementById('app');
  if (cleanup) { cleanup(); cleanup = null; }
  const ctx = { store, session, params, go: r => { location.hash = `#/${r}`; }, rerender: render };
  root.className = `view view-${name}`;
  root.innerHTML = view.render(ctx);
  cleanup = view.mount ? view.mount(root, ctx) || null : null;
  window.scrollTo(0, 0);
  const h = root.querySelector('h1, h2');
  document.title = h ? `${h.textContent.trim()} · 에이플로` : '에이플로';
}

window.addEventListener('hashchange', render);
render();
