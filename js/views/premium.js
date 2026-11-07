// 프리미엄 안내: 무료 vs 프리미엄 비교, 업그레이드 (결제 연동 전에는 시연용 체험 스위치)
import { topbar, tabbar, icon, esc, toast, mascotTalk } from '../ui.js';
import { FEATURES, FREE_DAILY_FILES, PRICE_LABEL, PAYMENT_READY, isPremium, setPremium, usedToday } from '../plan.js';

const cell = v => (v === true ? icon('check_circle', 'fill t-green') : v === false ? icon('lock', 't-muted') : `<b>${esc(v)}</b>`);

export default {
  render({ session }) {
    const on = isPremium();
    return `${topbar()}
    ${mascotTalk({ mood: on ? 'cheer' : 'quiz', html: on ? '"프리미엄 이용 중이야! 과제는 무제한, 자료 노트북도 마음껏 써!"' : `"무료는 하루 과제 ${FREE_DAILY_FILES}개까지야. 시험 기간엔 프리미엄으로 끝까지 방어하자!"` })}

    <section class="card tint stack">
      <div class="row wrap"><span class="chip ink">${icon('workspace_premium', 'fill')}A-Flo 프리미엄</span>${on ? '<span class="chip green">이용 중</span>' : ''}</div>
      <h1 class="h1">과제는 무제한,<br>공부는 내 자료로.</h1>
      <p class="muted b" style="margin:0">강의 PDF·한글 파일을 올리면 내 자료로만 답하는 노트북과 요약·예상 문제·암기 카드·개념 지도를 만들어 드려요.</p>
      <div class="price"><b>${PRICE_LABEL ? esc(PRICE_LABEL) : '가격은 출시 때 공개'}</b></div>
    </section>

    <section class="card stack plan-table" aria-label="요금제 비교">
      <div class="plan-row head"><span></span><span>무료</span><span class="pro">프리미엄</span></div>
      ${FEATURES.map(f => `<div class="plan-row">
        <span class="feat">${icon(f.icon)}<span><b>${esc(f.name)}</b>${f.desc ? `<span class="xs muted b">${esc(f.desc)}</span>` : ''}</span></span>
        <span>${cell(f.free)}</span><span class="pro">${cell(f.premium)}</span>
      </div>`).join('')}
    </section>

    ${on
      ? `<a class="btn green big" href="#/notebook">${icon('menu_book')}자료 노트북 열기</a>
         <button class="btn big" id="off">프리미엄 체험 끄기</button>`
      : `<button class="btn orange big" id="upgrade">${icon('workspace_premium', 'fill')}프리미엄 시작하기</button>
         <p class="xs muted b center" style="margin:0">오늘 무료 검사 ${Math.min(usedToday(), FREE_DAILY_FILES)}/${FREE_DAILY_FILES}개 사용</p>`}

    ${session.payNotice ? `<div class="modal-wash" role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <div class="modal">
        <h2 class="h2" id="pay-title">결제 연동 준비 중이에요</h2>
        <p class="muted b" style="margin:0">아직 실제 결제는 연결되지 않았어요. 지금은 기능을 미리 써 볼 수 있게 <b>프리미엄 체험</b>을 켤 수 있어요. 요금이 청구되지 않아요.</p>
        <button class="btn green big" id="trial">${icon('science')}프리미엄 체험 켜기 (시연용)</button>
        <button class="btn" id="cancel">닫기</button>
      </div>
    </div>` : ''}
    ${tabbar('')}`;
  },

  mount(root, { session, rerender, go }) {
    root.querySelector('#upgrade')?.addEventListener('click', () => {
      if (PAYMENT_READY) return; // 결제 연동 시 여기서 결제창 호출
      session.payNotice = true; rerender();
    });
    root.querySelector('#trial')?.addEventListener('click', () => {
      setPremium(true); session.payNotice = false;
      toast('프리미엄 체험을 켰어요!');
      go(session.afterUpgrade || 'notebook');
      session.afterUpgrade = null;
    });
    root.querySelector('#cancel')?.addEventListener('click', () => { session.payNotice = false; rerender(); });
    root.querySelector('#off')?.addEventListener('click', () => { setPremium(false); toast('무료 요금제로 돌아왔어요'); rerender(); });
  },
};
