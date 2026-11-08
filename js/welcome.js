// 맨 처음 방문했을 때 한 번: 무료 vs 프리미엄 차이를 보여 주는 안내 창
// 닫으면 store의 welcomed가 true가 되어 다시 뜨지 않아요. (요금제 비교 표는 프리미엄 화면과 함께 사용)
import * as store from './store.js';
import { icon, esc } from './ui.js';
import { FEATURES, FREE_DAILY_FILES } from './plan.js';

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
  if (store.get().welcomed || document.querySelector('.welcome-wash')) return;
  const wash = document.createElement('div');
  wash.className = 'modal-wash welcome-wash';
  wash.innerHTML = `<div class="modal welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <button class="welcome-x" type="button" data-close aria-label="안내 창 닫기">${icon('close')}</button>
    <img class="welcome-logo" src="assets/logo/a-flo-logo.svg" alt="A-flo 에이플로" width="150" height="50">
    <h2 class="h2" id="welcome-title">무료로 바로 시작할 수 있어요</h2>
    <p class="muted b" style="margin:0">과제 검사는 하루 ${FREE_DAILY_FILES}개까지 무료예요. 시험 기간엔 프리미엄으로 내 강의자료까지 공부해요.</p>
    ${planTable('무료와 프리미엄 비교')}
    <button class="btn green big" type="button" data-close>${icon('rocket_launch')}무료로 시작하기</button>
    <a class="link sm" href="#/premium" data-close>프리미엄 자세히 보기</a>
  </div>`;
  document.body.appendChild(wash);
  const prevFocus = document.activeElement;

  const close = () => {
    store.set({ welcomed: true });
    document.removeEventListener('keydown', onKey);
    wash.remove();
    if (prevFocus instanceof HTMLElement) prevFocus.focus();
  };
  const onKey = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // 창 안에서만 포커스가 돌게
      const f = [...wash.querySelectorAll('button, a[href]')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  wash.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  wash.addEventListener('click', e => { if (e.target === wash) close(); }); // 바깥 어두운 곳을 눌러도 닫혀요
  document.addEventListener('keydown', onKey);
  wash.querySelector('.btn').focus();
}
