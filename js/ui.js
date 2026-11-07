// 여러 화면이 같이 쓰는 작은 조각들
import * as store from './store.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const flame = (size = 20, color = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" fill="${color}"/></svg>`;

export const ticket = (size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16l-7-4-7 4z" fill="currentColor"/></svg>`;

export function topbar(title = '') {
  const s = store.get();
  return `<header class="topbar">
    ${title ? `<h1 class="topbar-title">${esc(title)}</h1>` : '<a class="logo" href="#/home">에이플로</a>'}
    <div class="pills">
      <span class="pill pill-flame" title="연속 학습">${flame(18)}<b>${store.currentStreak()}</b><span class="sr">일 연속</span></span>
      <span class="pill pill-credit" title="정밀 검사권">${ticket(18)}<b>${s.credits}</b><span class="sr">검사권</span></span>
    </div>
  </header>`;
}

const TABS = [
  ['home', '홈', '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>'],
  ['check', '과제 검사', '<path d="M6 3h9l4 4v14H6z"/><path d="M9 13l2 2 4-4"/>'],
  ['quiz', '퀴즈', '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01"/>'],
  ['my', '마이', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'],
];

export function tabbar(active) {
  return `<nav class="tabbar" aria-label="주요 메뉴">${TABS.map(([id, label, icon]) =>
    `<a href="#/${id}" class="${active === id ? 'on' : ''}" ${active === id ? 'aria-current="page"' : ''}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${icon}</svg>${label}</a>`).join('')}</nav>`;
}

export function bubble(html, mood = '') {
  return `<div class="bubble ${mood}">${html}</div>`;
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2700);
}

export const SEVERITY = { danger: '위험', warning: '주의', safe: '안전' };
