// 마이: 레벨·경험치, 내 코치(캐릭터 4종) 고르기, 검사 기록, 초기화
import { topbar, tabbar, icon, esc, toast, player } from '../ui.js';
import { mascot, CHARACTERS } from '../mascot.js';
import { isPremium, remaining, FREE_DAILY_FILES } from '../plan.js';

export default {
  render({ store }) {
    const { s, lv, stage, stageName, name } = player();
    const into = s.xp % 100;
    return `${topbar()}
    <section class="card tint stack">
      <div class="row">
        <div class="hero-avatar">${mascot(s.mascot, `lv${stage}`, 96, 'bob')}<span class="lv-badge">${icon('school', 'fill')}Lv.${lv}</span></div>
        <div class="grow"><h1 class="h2">${esc(stageName)} ${esc(name)}</h1><p class="sm muted b" style="margin:2px 0 0">다음 레벨까지 ${100 - into} XP</p></div>
      </div>
      <div class="progress" role="progressbar" aria-label="레벨 경험치" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${into}"><div class="bar" style="width:${into}%"></div></div>
      <p class="xs muted b" style="margin:0">퀴즈 정답 +30 XP · 과제 검사 완료 +30 XP · 3일 이상 연속이면 +20 XP 보너스. Lv.3에 열공, Lv.6에 마스터로 성장해요.</p>
    </section>

    <a class="card stack promo" href="#/premium">
      <div class="between"><span class="chip ink">${icon('workspace_premium', 'fill')}${isPremium() ? '프리미엄 이용 중' : '무료 요금제'}</span>${icon('chevron_right')}</div>
      <p class="sm b" style="margin:0">${isPremium() ? '과제 검사 무제한 · 자료 노트북 · 시험 대비 팩' : `오늘 남은 무료 검사 ${remaining()}/${FREE_DAILY_FILES}회 · 프리미엄으로 무제한`}</p>
    </a>

    <section class="grid-3">
      <div class="tile">${icon('local_fire_department', 'fill t-orange')}최고 연속<b>${s.best}일</b></div>
      <div class="tile">${icon('diamond', 'fill t-blue')}다이아<b>${s.gems.toLocaleString()}</b></div>
      <div class="tile">${icon('analytics', 'fill t-green')}진단<b>${s.history.length}건</b></div>
    </section>

    <section class="card stack">
      <h2 class="card-title">${icon('pets')}내 코치 고르기</h2>
      <div class="two" role="radiogroup" aria-label="마스코트">
        ${Object.entries(CHARACTERS).map(([k, c]) => `<button class="tag" style="height:auto;padding:14px 8px;border-radius:20px;display:flex;flex-direction:column;align-items:center;gap:4px" role="radio" aria-checked="${s.mascot === k}" aria-pressed="${s.mascot === k}" data-m="${k}">
          ${mascot(k, `lv${stage}`, 84)}<b>${esc(c.name)}</b><span class="xs muted">${esc(c.desc)}</span></button>`).join('')}
      </div>
    </section>

    <section class="card stack">
      <h2 class="card-title">${icon('history')}검사 기록</h2>
      ${s.history.length ? `<ul class="checklist">${s.history.map((h, i) => `<li class="auto">${icon('description', 'fill')}<div class="grow between"><span><b>${esc(h.title || '제목 없는 과제')}</b><br><span class="xs muted b">${esc(h.date)} · ${h.score}점</span></span><span class="row"><span class="chip green">${esc(h.grade)}</span><button class="btn sm icon-btn" data-del="${i}" aria-label="${esc(h.title || '제목 없는 과제')} 기록 삭제">${icon('delete')}</button></span></div></li>`).join('')}</ul>` : '<p class="muted b" style="margin:0">아직 기록이 없어요.</p>'}
    </section>

    <button class="btn red" id="reset">${icon('delete')}모든 기록 초기화</button>
    <p class="xs muted b center" style="margin:0">입력한 과제와 기록은 이 브라우저에만 저장돼요.</p>
    ${tabbar('')}`;
  },

  mount(root, { store, session, rerender }) {
    root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      store.set({ mascot: b.dataset.m });
      toast(`${CHARACTERS[b.dataset.m].name}와 함께해요!`);
      rerender();
    }));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const list = [...store.get().history];
      const [gone] = list.splice(Number(b.dataset.del), 1);
      store.set({ history: list });
      toast(`'${gone?.title || '제목 없는 과제'}' 기록을 지웠어요`);
      rerender();
    }));
    root.querySelector('#reset').addEventListener('click', () => {
      if (!window.confirm('연속 학습, 다이아, 경험치, 검사 기록이 모두 지워져요. 계속할까요?')) return;
      localStorage.removeItem('aflo:v1');
      Object.assign(session, { input: null, result: null, ai: null, baseScore: null });
      location.hash = '#/home';
      location.reload();
    });
  },
};
