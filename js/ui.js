// 여러 화면이 같이 쓰는 조각: 상단 바, 하단 탭, 아이콘, 마스코트 카드, 토스트
import * as store from './store.js';
import { mascot, CHARACTERS, stageOf, STAGE_NAME } from './mascot.js';
import { isPremium } from './plan.js';
import { a11ySettings, SCALES } from './a11y.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Material Symbols 아이콘 (글자 아이콘이라 화면 낭독기에서는 숨김)
export const icon = (name, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;

export function player() {
  const s = store.get();
  const lv = store.level();
  const stage = stageOf(lv);
  return { s, lv, stage, stageName: STAGE_NAME[stage], name: CHARACTERS[s.mascot].name, streak: store.currentStreak() };
}

// game: 연속·다이아·레벨 배지를 보여 줄지. 과제를 다루는 화면(검사·결과·교정)에서는 꺼서 결과에 집중하게 해요.
export function topbar({ game = true } = {}) {
  const { s, lv, streak } = player();
  return `<header class="topbar">
    <a class="brand-mark" href="#/check" aria-label="에이플로 · 과제 검사로"><img src="assets/logo/a-flo-symbol.svg" alt="" width="40" height="40"></a>
    <a class="avatar" href="#/check" aria-label="과제 검사로">${mascot(s.mascot, 'default', 40)}</a>
    ${game ? `<div class="pills">
      <span class="pill flame" title="연속 학습">${icon('local_fire_department', 'fill')}<b>${streak}일</b></span>
      <span class="pill gem" title="보유 다이아">${icon('diamond', 'fill')}<b>${s.gems.toLocaleString()}</b></span>
      <span class="pill lv" title="레벨 (경험치 ${s.xp})">${icon('bolt', 'fill')}<b>Lv.${lv}</b></span>
    </div>` : '<span class="grow"></span>'}
    ${a11yMenu()}
    <a class="me ${isPremium() ? 'pro' : ''}" href="#/my" aria-label="마이 페이지${isPremium() ? ' (프리미엄)' : ''}">${icon(isPremium() ? 'workspace_premium' : 'person', 'fill')}</a>
  </header>`;
}

// [주소, 휴대폰 탭 이름, 아이콘, 넓은 화면 사이드바 이름]
const TABS = [
  ['check', '과제 검사', 'upload_file', '과제 검사'],
  ['result', '맞춤 채점', 'analytics', '교수님 맞춤 채점'],
  ['editor', '교정', 'spellcheck', '교정 · 원클릭 반영'],
  ['home', '1분 퀴즈', 'quiz', '1분 퀴즈'],
  ['notebook', '노트북', 'menu_book', '노트북'],
];

// 휴대폰에서는 하단 탭, 넓은 화면(1024px 이상)에서는 왼쪽 사이드바로 보여요 (css 참고)
export function tabbar(active) {
  const tab = ([id, label, ic, long]) =>
    `<a href="#/${id}" class="${active === id ? 'on' : ''}" ${active === id ? 'aria-current="page"' : ''}>${icon(ic)}<span class="t-short">${label}</span><span class="t-long">${long}</span></a>`;
  return `<nav class="tabbar" aria-label="주요 메뉴">
    <a class="tab-brand" href="#/check"><img src="assets/logo/a-flo-logo.svg" alt="A-flo 에이플로" width="150" height="50"></a>
    ${TABS.slice(0, 4).map(tab).join('')}
    <a href="#/home?wn=1" class="desk-only">${icon('assignment_late')}<span>오답노트</span></a>
    ${tab(TABS[4])}
  </nav>`;
}

// 접근성 메뉴: 글자 크기 · 고대비 · 읽어주기 (동작은 a11y.js)
function a11yMenu() {
  const { scale, contrast } = a11ySettings();
  return `<details class="a11y">
    <summary aria-label="접근성 설정 (글자 크기, 고대비, 읽어주기)">${icon('accessibility_new')}<span class="a11y-label">접근성</span></summary>
    <div class="a11y-pop" role="group" aria-label="접근성 설정">
      <div class="a11y-row"><span class="b sm">글자 크기</span>
        <button class="btn sm" data-a11y="smaller" aria-label="글자 작게">가−</button>
        <b class="sm" aria-live="polite">${Math.round(SCALES[scale] * 100)}%</b>
        <button class="btn sm" data-a11y="bigger" aria-label="글자 크게">가+</button></div>
      <button class="btn sm" data-a11y="contrast" aria-pressed="${contrast}">${icon('contrast')}고대비 ${contrast ? '켜짐' : '꺼짐'}</button>
      <button class="btn sm" data-a11y="read" aria-pressed="false">${icon('volume_up')}<span>이 화면 읽어주기</span></button>
    </div>
  </details>`;
}

// 마스코트 + 말풍선 카드
// 캐릭터 말풍선. 평소에는 작게(compact), 반응하는 순간(연속 끊김 · 분석 완료 등)에만 big: true로 크게.
// (small은 예전 호출 호환용으로 남겨 둔 이름이에요. 이제 기본이 작아요)
export function mascotTalk({ mood = 'default', html, who = '', small = false, tint = false, badge = true, big = false }) {
  const { s, lv, stage } = player();
  const m = mood === 'stage' ? `lv${stage}` : mood;
  return `<section class="hero ${big ? '' : 'compact'}">
    <div class="hero-avatar">${mascot(s.mascot, m, big ? 96 : 48, big ? 'bob' : '')}${big && badge ? `<span class="lv-badge">${icon('school', 'fill')}Lv.${lv}</span>` : ''}</div>
    <div class="bubble ${tint ? 'tint' : ''}">${who ? `<div class="who">${who}</div>` : ''}${html}</div>
  </section>`;
}

export function dday(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((d - t) / 86400000);
  if (Number.isNaN(n) || n < 0) return '';
  return n === 0 ? 'D-DAY 방어전' : `D-${n} 방어전`;
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2900);
}

export const SEVERITY = { danger: '위험', warning: '주의', safe: '안전' };
export const LEVEL_WORD = { safe: '안전', warning: '주의', danger: '위험' };
