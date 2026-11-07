// 브라우저 localStorage에 저장하는 사용자 상태 (연속 학습, 크레딧, 검사 기록, 마스코트)
const KEY = 'aflo:v1';

const DEFAULT = {
  mascot: 'chick',
  streak: 0,
  best: 0,
  lastSolved: null, // 'YYYY-MM-DD'
  credits: 3,
  quizToday: {}, // { 'YYYY-MM-DD:assignment': { done: true, correct: true, offset: 0 } }
  history: [], // [{ date, title, score, grade }]
  draft: null, // 마지막 검사 입력
};

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
  state = { ...state, ...patch };
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

export function addHistory(entry) {
  set({ history: [{ date: today(), ...entry }, ...state.history].slice(0, 20) });
}
