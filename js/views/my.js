// 마이: 마스코트 선택(4종), 기록, 데이터 초기화
import { topbar, tabbar, esc, flame, toast } from '../ui.js';
import { mascot, CHARACTERS, levelOf } from '../mascot.js';

export default {
  render({ store }) {
    const s = store.get();
    const lvl = levelOf(store.currentStreak());
    return `${topbar('마이')}
    <section class="card stack">
      <h2 class="h3">내 코치 고르기</h2>
      <div class="grid-2 pick" role="radiogroup" aria-label="마스코트">
        ${Object.entries(CHARACTERS).map(([k, c]) => `<button class="pick-card ${s.mascot === k ? 'on' : ''}" role="radio" aria-checked="${s.mascot === k}" data-m="${k}">
          ${mascot(k, `lv${lvl}`, 88)}<b>${esc(c.name)}</b><span class="small muted">${esc(c.desc)}</span></button>`).join('')}
      </div>
    </section>
    <section class="grid-3">
      <div class="card stat"><span class="small muted">최고 연속</span><b>${flame(16)} ${s.best}일</b></div>
      <div class="card stat"><span class="small muted">정밀 검사권</span><b>${s.credits}개</b></div>
      <div class="card stat"><span class="small muted">검사한 과제</span><b>${s.history.length}건</b></div>
    </section>
    <section class="card stack">
      <h2 class="h3">검사 기록</h2>
      ${s.history.length ? `<ul class="list">${s.history.map(h => `<li><span>${esc(h.title || '제목 없는 과제')}<span class="small muted"> · ${esc(h.date)}</span></span><span><span class="small muted">${h.score}점</span> <b class="grade-chip">${esc(h.grade)}</b></span></li>`).join('')}</ul>` : '<p class="muted small">아직 기록이 없어요.</p>'}
    </section>
    <button class="btn danger-outline" id="reset">모든 기록 초기화</button>
    <p class="small muted center">입력한 과제와 기록은 이 브라우저에만 저장돼요.</p>
    ${tabbar('my')}`;
  },

  mount(root, { store, session, rerender }) {
    root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      store.set({ mascot: b.dataset.m });
      toast(`${CHARACTERS[b.dataset.m].name}와 함께해요!`);
      rerender();
    }));
    root.querySelector('#reset').addEventListener('click', () => {
      if (!window.confirm('연속 학습, 크레딧, 검사 기록이 모두 지워져요. 계속할까요?')) return;
      localStorage.removeItem('aflo:v1');
      session.input = null; session.result = null;
      location.hash = '#/home';
      location.reload();
    });
  },
};
