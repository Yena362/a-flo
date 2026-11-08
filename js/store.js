// 브라우저 localStorage에 저장하는 사용자 상태 (연속 학습, 크레딧, 검사 기록, 마스코트)
const KEY = 'aflo:v1';

const DEFAULT = {
  mascot: 'chick',
  streak: 0,
  best: 0,
  lastSolved: null, // 'YYYY-MM-DD'
  credits: 3,
  gems: 0, // 💎 퀴즈 보상 재화
  xp: 0, // 경험치 → 레벨
  rewarded: {}, // { 'YYYY-MM-DD:exam': true } 오늘 보상 받은 퀴즈
  plan: 'free', // 'free' | 'premium'
  welcomed: false, // 첫 방문 무료 vs 프리미엄 안내 창을 닫았는지 (welcome.js)
  usage: {}, // { date: 'YYYY-MM-DD', count: 오늘 검사한 과제 수 }
  quizToday: {}, // { 'YYYY-MM-DD:assignment': { done: true, correct: true, offset: 0 } }
  history: [], // [{ date, title, score, grade }]
  wrongNote: [], // 오답 노트 [{ id, q, options, answer, explain, from, misses, addedAt }] (wrong-note.js)
  draft: null, // 마지막 검사 입력
  updatedAt: 0, // 마지막으로 바뀐 시각(ms) — 클라우드와 합칠 때 어느 쪽이 최신인지 가리는 용도
};

// 값이 바뀔 때 알려 달라고 등록하는 곳 (cloud.js가 클라우드 백업에 사용)
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let state = load();

function load() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULT };
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경 */ }
}

export function get() { return state; }

export function set(patch) {
  state = { ...state, ...patch, updatedAt: Date.now() };
  save();
  for (const fn of listeners) {
    try { fn(state); } catch { /* 한 구독자의 오류가 저장을 막지 않게 */ }
  }
  return state;
}

// 클라우드에서 받은 값으로 통째로 바꾸기 (구독자에게 알리지 않아 다시 올리는 반복을 막아요)
export function replace(next) {
  state = { ...DEFAULT, ...next };
  save();
  return state;
}

export function today(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return today(d);
}

// 화면에 보여줄 연속 학습 일수 (어제도 안 풀었으면 끊긴 것)
export function currentStreak() {
  const { lastSolved, streak } = state;
  return lastSolved === today() || lastSolved === yesterday() ? streak : 0;
}

export function streakBroken() {
  return state.streak > 0 && currentStreak() === 0;
}

export function solvedToday() {
  return state.lastSolved === today();
}

// 퀴즈 정답 처리: 오늘 처음 맞히면 연속 학습 +1, 크레딧 +1
export function recordCorrect() {
  if (solvedToday()) return { streak: state.streak, firstToday: false };
  const streak = state.lastSolved === yesterday() ? state.streak + 1 : 1;
  set({ streak, best: Math.max(state.best, streak), lastSolved: today(), credits: state.credits + 1 });
  return { streak, firstToday: true };
}

// 💎·XP 지급
export function addReward({ gems = 0, xp = 0 }) {
  set({ gems: state.gems + gems, xp: state.xp + xp });
}

// 레벨: 경험치 100마다 1씩
export function level() {
  return 1 + Math.floor(state.xp / 100);
}

export function addHistory(entry) {
  set({ history: [{ date: today(), ...entry }, ...state.history].slice(0, 20) });
}
