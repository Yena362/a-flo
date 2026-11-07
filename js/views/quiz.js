// 1분 퀴즈: 과제 모드 / 시험 모드. 오늘 처음 맞히면 연속 학습 +1, 정밀 검사권 +1
import { topbar, tabbar, bubble, esc, toast } from '../ui.js';
import { mascot } from '../mascot.js';
import { dailyQuestion } from '../quiz-bank.js';
import { today } from '../store.js';

const MODES = { assignment: '과제 모드', exam: '시험 모드' };
const LETTERS = ['A', 'B', 'C', 'D'];

export default {
  render({ store, params }) {
    const mode = MODES[params.get('mode')] ? params.get('mode') : 'assignment';
    const key = `${today()}:${mode}`;
    const st = store.get().quizToday[key] || { offset: 0 };
    const q = dailyQuestion(mode, today(), st.offset);
    const done = st.picked != null;
    const correct = done && st.picked === q.answer;
    const mood = !done ? 'quiz' : correct ? 'cheer' : 'danger';
    const line = !done ? '1분이면 충분해. 골라 봐!' : correct ? '정답! 불꽃 이어가기 성공!' : '아깝다! 해설 보고 한 문제 더 도전해 볼까?';

    return `${topbar('1분 퀴즈')}
    <div class="seg" role="tablist" aria-label="퀴즈 모드">
      ${Object.entries(MODES).map(([id, label]) => `<a role="tab" href="#/quiz?mode=${id}" aria-selected="${id === mode}" class="${id === mode ? 'on' : ''}">${label}</a>`).join('')}
    </div>
    <section class="hero small-hero">${mascot(store.get().mascot, mood, 88)}${bubble(esc(line), done ? (correct ? 'safe' : 'danger') : '')}</section>
    <section class="card quiz" data-mode="${mode}">
      <p class="eyebrow">${MODES[mode]} · DAILY CHALLENGE${st.offset ? ` · 추가 문제 ${st.offset}` : ''}</p>
      <h2 class="q">${esc(q.q)}</h2>
      <div class="options">
        ${q.options.map((o, i) => {
          let cls = '';
          if (done && i === q.answer) cls = 'right';
          else if (done && i === st.picked) cls = 'wrong';
          return `<button class="option ${cls}" data-i="${i}" ${done ? 'disabled' : ''}><span class="letter">${LETTERS[i]}</span><span>${esc(o)}</span></button>`;
        }).join('')}
      </div>
      ${done ? `<div class="explain ${correct ? 'safe' : 'danger'}"><b>${correct ? '정답이에요' : `정답은 ${LETTERS[q.answer]}`}</b><p>${esc(q.explain)}</p></div>
        ${correct ? '<a class="btn primary" href="#/home">홈으로</a>' : '<button class="btn primary" id="next">다른 문제 도전</button>'}` : ''}
    </section>
    ${tabbar('quiz')}`;
  },

  mount(root, { store, params, rerender }) {
    const mode = MODES[params.get('mode')] ? params.get('mode') : 'assignment';
    const key = `${today()}:${mode}`;
    const saveQ = patch => {
      const all = { ...store.get().quizToday };
      // 오래된 날짜 기록은 정리
      for (const k of Object.keys(all)) if (!k.startsWith(today())) delete all[k];
      all[key] = { ...(all[key] || { offset: 0 }), ...patch };
      store.set({ quizToday: all });
    };
    root.querySelectorAll('.option').forEach(btn => btn.addEventListener('click', () => {
      const st = store.get().quizToday[key] || { offset: 0 };
      const q = dailyQuestion(mode, today(), st.offset);
      const picked = Number(btn.dataset.i);
      saveQ({ picked });
      if (picked === q.answer) {
        const r = store.recordCorrect();
        if (r.firstToday) toast(`불꽃 ${r.streak}일째! 정밀 검사권 +1`);
      }
      rerender();
    }));
    root.querySelector('#next')?.addEventListener('click', () => {
      const st = store.get().quizToday[key] || { offset: 0 };
      saveQ({ offset: st.offset + 1, picked: null });
      rerender();
    });
  },
};
