// 여러 화면이 같이 쓰는 조각: 상단 바, 하단 탭, 아이콘, 마스코트 카드, 토스트
import * as store from './store.js';
import { mascot, CHARACTERS, stageOf, STAGE_NAME } from './mascot.js';
import { isPremium } from './plan.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Material Symbols 아이콘 (글자 아이콘이라 화면 낭독기에서는 숨김)
export const icon = (name, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;

export function player() {
  const s = store.get();
  const lv = store.level();
  const stage = stageOf(lv);
  return { s, lv, stage, stageName: STAGE_NAME[stage], name: CHARACTERS[s.mascot].name, streak: store.currentStreak() };
}

export function topbar() {
  const { s, lv, streak } = player();
  return `<header class="topbar">
    <a class="avatar" href="#/home" aria-label="홈으로">${mascot(s.mascot, 'default', 40)}</a>
    <div class="pills">
      <span class="pill flame" title="연속 학습">${icon('local_fire_department', 'fill')}<b>${streak}일</b></span>
      <span class="pill gem" title="보유 다이아">${icon('diamond', 'fill')}<b>${s.gems.toLocaleString()}</b></span>
      <span class="pill lv" title="레벨 (경험치 ${s.xp})">${icon('bolt', 'fill')}<b>Lv.${lv}</b></span>
    </div>
    <a class="me ${isPremium() ? 'pro' : ''}" href="#/my" aria-label="마이 페이지${isPremium() ? ' (프리미엄)' : ''}">${icon(isPremium() ? 'workspace_premium' : 'person', 'fill')}</a>
  </header>`;
}

const TABS = [
  ['home', '홈', 'cottage'],
  ['check', '과제 제출', 'upload_file'],
  ['result', '점수 진단', 'analytics'],
  ['editor', '교정', 'spellcheck'],
  ['notebook', '노트북', 'menu_book'],
];

export function tabbar(active) {
  return `<nav class="tabbar" aria-label="주요 메뉴">${TABS.map(([id, label, ic]) =>
    `<a href="#/${id}" class="${active === id ? 'on' : ''}" ${active === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}</a>`).join('')}</nav>`;
}

// 마스코트 + 말풍선 카드
export function mascotTalk({ mood = 'default', html, who = '', small = false, tint = false, badge = true }) {
  const { s, lv, stage } = player();
  const m = mood === 'stage' ? `lv${stage}` : mood;
  return `<section class="hero">
    <div class="hero-avatar ${small ? 'sm' : ''}">${mascot(s.mascot, m, small ? 70 : 96, 'bob')}${badge ? `<span class="lv-badge">${icon('school', 'fill')}Lv.${lv}</span>` : ''}</div>
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
