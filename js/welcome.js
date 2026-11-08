// 앱을 열 때(첫 화면에서) 무료 vs 프리미엄 차이를 보여 주는 안내 창
// - "무료로 시작하기"로 넘어가면 다음에 앱을 열거나 새로고침할 때 또 떠요.
// - X 버튼으로 닫으면 store의 welcomeHidden이 true가 되어 그 뒤로는 계속 안 떠요.
// - 바깥 어두운 곳 누르기 · Esc는 이번만 닫혀요 (실수로 눌러도 다음에 다시 떠요).
// - 예전 welcomeClosed(바깥 누르기·Esc까지 영구 닫기였음)는 쓰지 않아요 → 이미 닫은 사람도 한 번은 다시 보여요.
// (프리미엄 이용자는 문구만 달라요. 요금제 비교 표는 프리미엄 화면과 함께 사용)
import * as store from './store.js';
import { icon, esc } from './ui.js';
import { FEATURES, FREE_DAILY_FILES, isPremium } from './plan.js';

const cell = v => (v === true ? icon('check_circle', 'fill t-green') : v === false ? icon('lock', 't-muted') : `<b>${esc(v)}</b>`);

export function planTable(label = '요금제 비교') {
  return `<section class="card stack plan-table" aria-label="${esc(label)}">
    <div class="plan-row head"><span></span><span>무료</span><span class="pro">프리미엄</span></div>
    ${FEATURES.map(f => `<div class="plan-row">
      <span class="feat">${icon(f.icon)}<span><b>${esc(f.name)}</b>${f.desc ? `<span class="xs muted b">${esc(f.desc)}</span>` : ''}</span></span>
      <span>${cell(f.free)}</span><span class="pro">${cell(f.premium)}</span>
    </div>`).join('')}
  </section>`;
}

export function showWelcome() {
  if (store.get().welcomeHidden || document.querySelector('.welcome-wash')) return;
  const pro = isPremium(); // 프리미엄 이용자에게는 문구만 바꿔서 보여 줘요
  const wash = document.createElement('div');
  wash.className = 'modal-wash welcome-wash';
  wash.innerHTML = `<div class="modal welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <button class="welcome-x" type="button" data-dismiss aria-label="창 닫기 (다시 보지 않기)" title="창 닫기 · 다시 보지 않기">${icon('close')}</button>
    <img class="welcome-logo" src="assets/logo/a-flo-logo.svg" alt="A-flo 에이플로" width="150" height="50">
    <h2 class="h2" id="welcome-title">${pro ? '프리미엄 이용 중이에요' : '무료로 바로 시작할 수 있어요'}</h2>
    <p class="muted b" style="margin:0">${pro ? '과제 검사 무제한, 자료 노트북과 시험 대비 팩까지 모두 쓸 수 있어요.' : `과제 검사는 하루 ${FREE_DAILY_FILES}개까지 무료예요. 시험 기간엔 프리미엄으로 내 강의자료까지 공부해요.`}</p>
    ${planTable('무료와 프리미엄 비교')}
    <button class="btn green big" type="button" data-start>${icon('rocket_launch')}${pro ? '과제 검사 시작하기' : '무료로 시작하기'}</button>
    <a class="link sm" href="#/premium" data-close>${pro ? '내 요금제 보기' : '프리미엄 자세히 보기'}</a>
  </div>`;
  document.body.appendChild(wash);
  const prevFocus = document.activeElement;

  const close = ({ forever = false } = {}) => {
    if (forever) store.set({ welcomeHidden: true }); // X로 닫으면 다음부터 안 띄워요
    document.removeEventListener('keydown', onKey);
    wash.remove();
    if (prevFocus instanceof HTMLElement) prevFocus.focus();
  };
  const onKey = e => {
    if (e.key === 'Escape') close(); // Esc는 이번만 닫기
    if (e.key === 'Tab') { // 창 안에서만 포커스가 돌게
      const f = [...wash.querySelectorAll('button, a[href]')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  wash.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close()));
  wash.querySelector('[data-dismiss]').addEventListener('click', () => close({ forever: true }));
  // 시작하기: 창을 닫고 과제 검사 화면의 1단계(과제 올리기)로 바로 이동
  wash.querySelector('[data-start]').addEventListener('click', () => {
    close();
    const toUpload = () => document.querySelector('[aria-labelledby="st1"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (location.hash.split('?')[0] === '#/check') toUpload();
    else { location.hash = '#/check'; setTimeout(toUpload, 60); }
  });
  wash.addEventListener('click', e => { if (e.target === wash) close(); }); // 바깥 어두운 곳은 이번만 닫기
  document.addEventListener('keydown', onKey);
  wash.querySelector('[data-start]').focus();
}
