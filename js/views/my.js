// 마이: 레벨·경험치, 내 코치(캐릭터 4종) 고르기, 검사 기록, 초기화
import { topbar, tabbar, icon, esc, toast, player } from '../ui.js';
import { mascot, CHARACTERS } from '../mascot.js';
import { isPremium, remaining, FREE_DAILY_FILES } from '../plan.js';
import { isConfigured, getUser, signIn, signOut, clearCloud } from '../cloud.js';

// 로그인 실패 이유를 알기 쉬운 말로
const LOGIN_ERRORS = {
  'auth/popup-blocked': '팝업이 막혔어요. 팝업을 허용하고 다시 눌러 주세요.',
  'auth/unauthorized-domain': '이 주소는 로그인이 허용되지 않았어요. Firebase 콘솔의 승인된 도메인을 확인해 주세요.',
  'auth/operation-not-allowed': 'Google 로그인이 아직 켜져 있지 않아요. Firebase 콘솔에서 켜 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
};

// 기록 백업(Google 로그인) 카드. Firebase 설정이 비어 있으면 아무것도 보이지 않아요.
function accountCard() {
  if (!isConfigured()) return '';
  const u = getUser();
  if (u) {
    return `<section class="card stack">
      <div class="row">
        ${u.photo ? `<img class="acct-photo" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : icon('account_circle', 'fill')}
        <div class="grow"><b>${esc(u.name || '내 계정')}</b><br><span class="xs muted b">${esc(u.email || '')}</span></div>
      </div>
      <p class="xs muted b" style="margin:0">${icon('cloud_done')} 기록이 내 계정에 백업돼요. 다른 기기에서 로그인하면 이어서 쓸 수 있어요. 과제 원문과 요금제는 이 기기에만 저장돼요.</p>
      <button class="btn" id="logout">${icon('logout')}로그아웃</button>
    </section>`;
  }
  return `<section class="card stack">
    <h2 class="card-title">${icon('cloud_sync')}기록 백업</h2>
    <p class="sm muted b" style="margin:0">Google로 로그인하면 연속 학습·다이아·경험치·검사 기록이 내 계정에 백업되고, 다른 기기에서도 이어 쓸 수 있어요.</p>
    <button class="btn green" id="login">${icon('login')}Google로 로그인</button>
  </section>`;
}

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

    ${accountCard()}

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
    <p class="xs muted b center" style="margin:0">${getUser() ? '기록은 내 계정에 백업되고, 입력한 과제 원문은 이 브라우저에만 저장돼요.' : '입력한 과제와 기록은 이 브라우저에만 저장돼요.'}</p>
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
    root.querySelector('#login')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await signIn();
        toast('로그인했어요! 기록이 백업돼요');
      } catch (err) {
        if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
          toast(LOGIN_ERRORS[err?.code] || '로그인에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
        }
        btn.disabled = false;
      }
    });
    root.querySelector('#logout')?.addEventListener('click', async () => {
      try { await signOut(); toast('로그아웃했어요'); } catch { toast('로그아웃에 실패했어요. 다시 시도해 주세요.'); }
    });
    root.querySelector('#reset').addEventListener('click', async () => {
      const cloudNote = getUser() ? ' (내 계정에 백업된 기록도 함께 지워져요)' : '';
      if (!window.confirm(`연속 학습, 다이아, 경험치, 검사 기록이 모두 지워져요${cloudNote}. 계속할까요?`)) return;
      if (getUser()) {
        try { await clearCloud(); } catch { toast('백업 기록을 지우지 못했어요. 인터넷 연결을 확인해 주세요.'); return; }
      }
      localStorage.removeItem('aflo:v1');
      Object.assign(session, { input: null, result: null, ai: null, baseScore: null });
      location.hash = '#/check';
      location.reload();
    });
  },
};
