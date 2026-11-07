// 홈: 연속 학습 불꽃, 마스코트 브리핑, 1분 퀴즈 진입, 과제 검사 진입
import { topbar, tabbar, flame, bubble, esc } from '../ui.js';
import { mascot, CHARACTERS, levelOf } from '../mascot.js';
import { today } from '../store.js';

const LEVEL_NAME = { 1: '초보', 2: '열공', 3: '마스터' };
const NEXT_LEVEL_AT = { 1: 3, 2: 14 };

export default {
  render({ store }) {
    const s = store.get();
    const streak = store.currentStreak();
    const broken = store.streakBroken();
    const solved = store.solvedToday();
    const lvl = levelOf(streak);
    const name = CHARACTERS[s.mascot].name;

    let mood = 'quiz', line = '오늘의 1분 퀴즈 풀고 불꽃을 이어가볼까?';
    if (broken) { mood = 'sad'; line = `불꽃이 꺼졌어… 오늘 퀴즈 한 문제로 다시 살려 보자!`; }
    else if (solved) { mood = `lv${lvl}`; line = `오늘 퀴즈 완료! ${streak}일째 불꽃 유지 중이야. 과제 검사도 해 볼까?`; }

    // 이번 주 7일 불꽃 (오늘 기준으로 지난 6일 + 오늘)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const lit = i === 0 ? solved : (streak > 0 && i <= (solved ? streak - 1 : streak) && !broken);
      days.push({ label: '일월화수목금토'[d.getDay()], lit, isToday: i === 0 });
    }
    const next = NEXT_LEVEL_AT[lvl];

    return `${topbar()}
    <section class="hero">
      ${mascot(s.mascot, mood, 112, 'bob')}
      ${bubble(esc(line))}
    </section>

    <section class="card">
      <div class="row-between">
        <h2 class="h2">${streak}일 연속 학습 ${streak ? '중!' : ''}</h2>
        <span class="muted small">최고 기록 ${s.best}일</span>
      </div>
      <ol class="week" aria-label="이번 주 학습 기록">
        ${days.map(d => `<li class="${d.lit ? 'lit' : ''} ${d.isToday ? 'today' : ''}"><span class="dot">${flame(18)}</span><span class="small">${d.label}</span><span class="sr">${d.lit ? '학습함' : '안 함'}</span></li>`).join('')}
      </ol>
      <p class="level small"><b>Lv.${lvl} ${LEVEL_NAME[lvl]} ${esc(name)}</b>${next ? ` · ${next - streak}일 더 이어가면 Lv.${lvl + 1}` : ' · 최고 레벨 달성!'}</p>
    </section>

    <section class="stack">
      <h2 class="h2">오늘의 1분 퀴즈</h2>
      <div class="grid-2">
        <a class="btn-chunky mode" href="#/quiz?mode=assignment"><b>과제 모드</b><span class="small">인용·작성 상식</span></a>
        <a class="btn-chunky mode alt" href="#/quiz?mode=exam"><b>시험 모드</b><span class="small">전공 핵심 개념</span></a>
      </div>
    </section>

    <a class="card cta" href="#/check">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 15V5m0 0l-4 4m4-4l4 4M5 19h14"/></svg>
      <span><b>새 과제 검사하기</b><span class="small">교수님 지시사항 맞춤 채점 · DOCX/TXT</span></span>
    </a>

    ${s.history.length ? `<section class="stack">
      <h2 class="h2">최근 검사</h2>
      <ul class="list">${s.history.slice(0, 3).map(h => `<li><span>${esc(h.title || '제목 없는 과제')}<span class="small muted"> · ${h.date === today() ? '오늘' : esc(h.date)}</span></span><b class="grade-chip">${esc(h.grade)}</b></li>`).join('')}</ul>
    </section>` : ''}
    ${tabbar('home')}`;
  },
};
