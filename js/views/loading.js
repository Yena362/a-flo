// STEP 3. 분석 대기 화면 (3~4초): 마스코트 애니메이션 + 진행 문구
import { mascot } from '../mascot.js';
import { analyze } from '../analyzer.js';

const STEPS = ['교수님 지시사항 분석 중...', '표절 및 문단 대조 중...', '감점 요소 추출 중...'];
const DURATION = 3600;

export default {
  render({ store }) {
    return `<section class="loading">
      ${mascot(store.get().mascot, 'analyzing', 160, 'bob')}
      <div class="bubble">교수님 지시사항과 대조하고 있어! 잠시만 기다려줘.</div>
      <h1 class="loading-step" id="step" aria-live="polite">${STEPS[0]}</h1>
      <div class="progress" role="progressbar" aria-label="분석 진행률" aria-valuemin="0" aria-valuemax="100"><div class="bar" id="bar"></div></div>
    </section>`;
  },

  mount(root, { store, session, go }) {
    if (!session.input) session.input = store.get().draft;
    if (!session.input) { go('check'); return; }
    session.result = analyze(session.input);

    const step = root.querySelector('#step');
    const bar = root.querySelector('#bar');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = reduced ? 800 : DURATION;
    const start = performance.now();
    let raf;
    const tick = now => {
      const t = Math.min(1, (now - start) / total);
      bar.style.width = `${Math.round(t * 100)}%`;
      bar.parentElement.setAttribute('aria-valuenow', Math.round(t * 100));
      step.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(t * STEPS.length))];
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        const r = session.result;
        store.addHistory({ title: session.input.title, score: r.score, grade: r.grade });
        go('result');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  },
};
