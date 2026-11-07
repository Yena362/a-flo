// 오답 노트: 예상 문제에서 틀린 문제를 모아 홈에서 다시 풀게 해요.
// store.js 상태(wrongNote)에 저장하므로 로그인하면 클라우드에도 함께 백업돼요.
import * as store from './store.js';
import { icon, esc } from './ui.js';

const MAX = 50;

// 같은 문제를 두 번 담지 않도록 문제 글로 간단한 id를 만든다
export function noteId(q) {
  const s = `${q.q}|${(q.options || []).join('|')}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `w${(h >>> 0).toString(36)}`;
}

export function list() {
  return Array.isArray(store.get().wrongNote) ? store.get().wrongNote : [];
}

export function has(q) {
  const id = noteId(q);
  return list().some(w => w.id === id);
}

// 틀린 문제 담기. 이미 있으면 틀린 횟수만 올리고 맨 위로
export function addWrong(q, from = '') {
  const id = noteId(q);
  const prev = list().find(w => w.id === id);
  const item = {
    id,
    q: q.q,
    options: q.options,
    answer: q.answer,
    explain: q.explain || '',
    from: from || prev?.from || '',
    misses: (prev?.misses || 0) + 1,
    addedAt: prev?.addedAt || Date.now(),
    lastMissedAt: Date.now(),
  };
  store.set({ wrongNote: [item, ...list().filter(w => w.id !== id)].slice(0, MAX) });
}

export function removeWrong(id) {
  store.set({ wrongNote: list().filter(w => w.id !== id) });
}

// 다시 풀기 상태: { tried: [고른 보기들], solved, revealed }
export function pickState(st, k, answer) {
  const s = st || { tried: [], solved: false, revealed: false };
  if (s.solved || s.revealed || s.tried.includes(k)) return s;
  return { ...s, tried: [...s.tried, k], solved: k === answer };
}

// 다시 풀 수 있는 문제 화면 조각 (노트북 예상 문제 · 홈 오답 노트가 함께 사용)
// attr: 보기 버튼에 붙일 data 속성 이름 (예: 'data-q="3"'), revealAttr: '정답 보기' 버튼 속성
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
export function retryHtml(q, st, { attr, revealAttr, savedNote = false, extra = '' }) {
  const s = st || { tried: [], solved: false, revealed: false };
  const over = s.solved || s.revealed;
  const opts = q.options.map((o, k) => {
    let cls = '';
    if (over && k === q.answer) cls = 'right';
    else if (s.tried.includes(k)) cls = 'wrong';
    const off = over || s.tried.includes(k);
    const mark = over && k === q.answer ? icon('check', 'fill') : s.tried.includes(k) ? icon('close') : LETTERS[k];
    return `<button class="option ${cls}" ${attr} data-k="${k}" ${off ? 'disabled' : ''}><span class="letter">${mark}</span><span>${esc(o)}</span></button>`;
  }).join('');
  let fb = '';
  if (s.solved) {
    fb = `<div class="explain safe"><b>${s.tried.length > 1 ? `정답! ${s.tried.length}번 만에 맞혔어요` : '정답!'}</b><p>${esc(q.explain)}</p>${extra}</div>`;
  } else if (s.revealed) {
    fb = `<div class="explain danger"><b>정답은 ${LETTERS[q.answer]}</b><p>${esc(q.explain)}</p>${extra}</div>`;
  } else if (s.tried.length) {
    fb = `<div class="explain danger"><b>${icon('replay')} 틀렸어요. 다른 보기를 다시 골라 보세요</b>
      <p class="sm">${savedNote ? `${icon('bookmark_added', 'fill')} 홈 오답 노트에 담았어요 · ` : ''}<button class="link sm" ${revealAttr}>정답 바로 보기</button></p></div>`;
  }
  return `<div class="options">${opts}</div>${fb}`;
}
