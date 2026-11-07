// 홈: 마스코트 브리핑, 연속 학습(스트릭) 달력, 과제/시험 모드 1분 퀴즈, 정답 보상, 과제 진단 진입
import { topbar, tabbar, icon, esc, mascotTalk, player, dday } from '../ui.js';
import { mascot } from '../mascot.js';
import { dailyQuestion } from '../quiz-bank.js';
import { today } from '../store.js';
import { isPremium, remaining, FREE_DAILY_FILES } from '../plan.js';

// 퀴즈는 시험 모드(전공 핵심 개념)만 운영
const MODE = 'exam';
const TOPIC = '시험 대비 · 전공 개념';
const LETTERS = ['A', 'B', 'C', 'D'];
const REWARD = { gems: 50, xp: 30, streakBonusXp: 20 };
let selected = null; // 제출 전 고른 보기

function week(streak, solved) {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // 월=0
  const span = solved ? streak - 1 : streak; // 오늘 이전에 불이 켜진 날 수
  return ['월', '화', '수', '목', '금', '토', '일'].map((label, i) => {
    if (i === todayIdx) return { label: '오늘', cls: solved ? 'today' : 'today pending', ic: 'local_fire_department', sr: solved ? '오늘 학습 완료' : '오늘 아직 안 함' };
    if (i > todayIdx) return { label, cls: 'future', ic: 'lock', sr: '다가올 날' };
    const ago = todayIdx - i;
    const lit = ago <= span;
    return { label, cls: lit ? 'lit' : '', ic: 'local_fire_department', sr: lit ? '학습함' : '안 함' };
  });
}

export default {
  render({ store, session }) {
    const { s, stageName, name, streak } = player();
    const solved = store.solvedToday();
    const broken = store.streakBroken();
    const key = `${today()}:${MODE}`;
    const st = s.quizToday[key] || { offset: 0 };
    const q = dailyQuestion(MODE, today(), st.offset);
    const done = st.picked != null;
    const correct = done && st.picked === q.answer;
    const due = dday(s.draft?.dueDate);

    let line = '오늘의 1분 퀴즈 풀고 불꽃을 이어가볼까?', mood = 'quiz';
    if (broken) { line = '불꽃이 꺼졌어… 오늘 퀴즈 한 문제로 다시 살려 보자!'; mood = 'sad'; }
    else if (solved) { line = `오늘 퀴즈 완료! ${streak}일째 불꽃 유지 중이야. 과제도 미리 점검해 볼까?`; mood = 'stage'; }

    const days = week(streak, solved);
    const bonus = streak >= 3;

    return `${topbar()}
    ${mascotTalk({ mood, html: `"${esc(line)}"`, who: `${esc(stageName)} ${esc(name)} ${due ? `<span class="chip red xs">${esc(due)}</span>` : ''}` })}

    <section class="card">
      <div class="between">
        <div class="streak-head">${icon('local_fire_department', 'fill big-flame')}
          <div><h2 class="h2">${streak}일 연속 스트릭!</h2><p class="sm muted b" style="margin:0">최고 기록 ${s.best}일 · 누적 ${s.history.length}건 진단</p></div>
        </div>
        ${bonus ? `<span class="chip orange">${icon('local_fire_department', 'fill')}열정 보너스 +${REWARD.streakBonusXp} XP</span>` : ''}
      </div>
      <ol class="week" aria-label="이번 주 학습 기록">
        ${days.map(d => `<li class="${d.cls}"><span>${d.label}</span><span class="d">${icon(d.ic, 'fill')}</span><span class="sr">${d.sr}</span></li>`).join('')}
      </ol>
    </section>

    <section class="card quiz stack" style="gap:16px">
      <div class="row wrap">
        <span class="chip blue">${icon('timer')}오늘의 1분 퀴즈 · ${TOPIC}</span>
        <span class="chip blue">${icon('diamond', 'fill')}+${REWARD.gems} 보상</span>
        ${st.offset ? `<span class="chip">추가 문제 ${st.offset}</span>` : ''}
      </div>
      <h2 class="q">${esc(q.q)}</h2>
      <p class="muted b" style="margin:-6px 0 0">정답을 고르고 감점 방어 팁을 확인해 보세요!</p>
      <div class="options" role="radiogroup" aria-label="보기">
        ${q.options.map((o, i) => {
          let cls = '';
          if (done) cls = i === q.answer ? 'right' : i === st.picked ? 'wrong' : '';
          else if (selected === i) cls = 'picked';
          const mark = done && i === q.answer ? icon('check', 'fill') : LETTERS[i];
          return `<button class="option ${cls}" data-i="${i}" role="radio" aria-checked="${selected === i || (done && st.picked === i)}" ${done ? 'disabled' : ''}><span class="letter">${mark}</span><span>${esc(o)}</span></button>`;
        }).join('')}
      </div>
      ${done
        ? `<div class="explain ${correct ? 'safe' : 'danger'}"><b>${correct ? '정답이에요! 감점 방어 완료' : `아깝다! 정답은 ${LETTERS[q.answer]}`}</b><p>${esc(q.explain)}</p></div>
           ${correct ? '' : '<button class="btn orange big" id="next">' + icon('refresh') + '다른 문제 도전</button>'}`
        : `<button class="btn dkgreen big" id="submit" ${selected == null ? 'disabled' : ''}>${icon('verified', 'fill')}정답 확인하고 +${REWARD.gems}💎 받기</button>`}
    </section>

    <section class="card tint stack">
      <div class="row wrap"><span class="chip orange">${icon('rocket_launch')}과제 제출 직전 긴급 케어</span></div>
      <h2 class="h2">과제 제출 직전인가요?</h2>
      <p class="muted b" style="margin:0">교수님 성향과 수업 중 지시사항에 맞춰 감점 포인트를 ${esc(name)}가 짚어 드려요.</p>
      <div class="between wrap">
        <span class="row sm b">${s.history[0] ? `<span class="chip green">최근 ${esc(s.history[0].grade)}</span>` : ''}<span class="muted">누적 진단 ${s.history.length}건</span></span>
        <a class="btn" href="#/check">정밀 진단 시작 ${icon('arrow_forward')}</a>
      </div>
    </section>

    <a class="card stack promo" href="${isPremium() ? '#/notebook' : '#/premium'}">
      <div class="between"><span class="chip ink">${icon('workspace_premium', 'fill')}PREMIUM</span><span class="sm b">${isPremium() ? '이용 중' : `오늘 무료 검사 ${remaining()}/${FREE_DAILY_FILES}`}</span></div>
      <h2 class="h3">${isPremium() ? '자료 노트북 열기' : '시험 기간엔 프리미엄으로'}</h2>
      <p class="sm b" style="margin:0">과제 검사 무제한 · 내 강의자료로 답하는 노트북 · 요약·예상 문제·암기 카드·개념 지도</p>
    </a>

    ${session.reward ? `<div class="modal-wash" role="dialog" aria-modal="true" aria-labelledby="rw-title">
      <div class="modal">
        <div style="display:grid;place-items:center">${mascot(s.mascot, 'cheer', 120, 'bob')}</div>
        <h2 class="h2" id="rw-title">완벽해요! 정답입니다 🎉</h2>
        <p class="muted b" style="margin:0">${esc(session.reward.explain)}</p>
        <div class="rewards">
          <div class="reward">${icon('diamond', 'fill t-blue')}+${session.reward.gems}<small>다이아</small></div>
          <div class="reward">${icon('bolt', 'fill t-green')}+${session.reward.xp} XP<small>경험치</small></div>
          <div class="reward">${icon('local_fire_department', 'fill t-orange')}${session.reward.streak}일<small>${session.reward.firstToday ? '스트릭 방어!' : '연속 학습'}</small></div>
        </div>
        <button class="btn green big" id="close-reward">계속하기</button>
      </div>
    </div>` : ''}
    ${tabbar('home')}`;
  },

  mount(root, { store, session, rerender }) {
    const key = `${today()}:${MODE}`;
    const saveQ = patch => {
      const all = { ...store.get().quizToday };
      for (const k of Object.keys(all)) if (!k.startsWith(today())) delete all[k];
      all[key] = { ...(all[key] || { offset: 0 }), ...patch };
      store.set({ quizToday: all });
    };

    root.querySelectorAll('.option:not(:disabled)').forEach(b => b.addEventListener('click', () => {
      selected = Number(b.dataset.i);
      rerender();
    }));

    root.querySelector('#submit')?.addEventListener('click', () => {
      if (selected == null) return;
      const st = store.get().quizToday[key] || { offset: 0 };
      const q = dailyQuestion(MODE, today(), st.offset);
      const picked = selected;
      selected = null;
      saveQ({ picked });
      if (picked === q.answer) {
        const r = store.recordCorrect();
        const rewardedKey = store.get().rewarded?.[key];
        let gems = 0, xp = 0;
        if (!rewardedKey) {
          gems = REWARD.gems; xp = REWARD.xp;
          if (r.firstToday && r.streak >= 3) xp += REWARD.streakBonusXp;
          store.addReward({ gems, xp });
          const rw = {};
          for (const [k, v] of Object.entries(store.get().rewarded || {})) if (k.startsWith(today())) rw[k] = v;
          store.set({ rewarded: { ...rw, [key]: true } });
        }
        session.reward = { gems, xp, streak: r.streak, firstToday: r.firstToday, explain: q.explain };
      }
      rerender();
    });

    root.querySelector('#next')?.addEventListener('click', () => {
      const st = store.get().quizToday[key] || { offset: 0 };
      saveQ({ offset: st.offset + 1, picked: null });
      selected = null;
      rerender();
    });

    const close = () => { session.reward = null; rerender(); };
    root.querySelector('#close-reward')?.addEventListener('click', close);
    const onKey = e => { if (e.key === 'Escape' && session.reward) close(); };
    document.addEventListener('keydown', onKey);
    root.querySelector('#close-reward')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  },
};
