// STEP 3. 분석 대기 화면: 마스코트 애니메이션 + 진행 문구
// 규칙 엔진 + Gemini 채점을 동시에 시작하고, 최소 연출 시간과 AI 응답을 모두 기다린다.
import { mascot } from '../mascot.js';
import { analyzeWithAI } from '../ai.js';
import { toast } from '../ui.js';

const STEPS = ['교수님 지시사항 분석 중...', '표절 및 문단 대조 중...', '감점 요소 추출 중...', 'AI가 내용과 논리를 읽는 중...'];
const MIN_DURATION = 3600;

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

    const step = root.querySelector('#step');
    const bar = root.querySelector('#bar');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minTime = reduced ? 800 : MIN_DURATION;
    const start = performance.now();
    let done = false, cancelled = false, raf;

    // 진행 막대: AI를 기다리는 동안은 90%에서 천천히 멈춤
    const tick = now => {
      const t = (now - start) / minTime;
      const p = done ? 1 : Math.min(0.9, t < 1 ? t * 0.8 : 0.8 + (1 - Math.exp(-(t - 1) / 3)) * 0.1);
      bar.style.width = `${Math.round(p * 100)}%`;
      bar.parentElement.setAttribute('aria-valuenow', Math.round(p * 100));
      step.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(Math.min(t, 0.999) * (STEPS.length - 1)) + (t >= 1 ? 1 : 0))];
      if (!cancelled) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    Promise.all([
      analyzeWithAI(session.input),
      new Promise(r => setTimeout(r, minTime)),
    ]).then(([out]) => {
      if (cancelled) return;
      done = true;
      session.result = out.result;
      session.ai = out.ai;
      session.aiError = out.error;
      store.addHistory({ title: session.input.title, score: out.result.score, grade: out.result.grade });
      go('result');
      if (out.error) toast(`AI 채점 없이 기본 채점만 했어요: ${out.error}`);
    });

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  },
};
