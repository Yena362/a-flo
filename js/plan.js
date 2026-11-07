// 요금제: 무료(하루 과제 2개) / 프리미엄(무제한 + 자료 노트북 + 시험 대비 팩)
//
// ⚠️ 지금은 결제 연동 전이라 "프리미엄 체험" 스위치로만 켜고 끄며, 사용량도 이 브라우저에만 기록돼요.
//    실제 출시 때는 로그인 + 서버(DB)에서 결제 여부와 사용량을 확인해야 우회할 수 없어요. (docs/PLAN.md)
import * as store from './store.js';

export const FREE_DAILY_FILES = 2;
export const PRICE_LABEL = ''; // 결제 연동 시 금액 표기 (예: '월 ○,○○○원'). 비워 두면 "출시 때 공개"
export const PAYMENT_READY = false; // 토스페이먼츠 등 결제 연동이 끝나면 true

export const FEATURES = [
  { icon: 'upload_file', name: '과제 검사', free: `하루 ${FREE_DAILY_FILES}개`, premium: '무제한' },
  { icon: 'menu_book', name: '자료 노트북', desc: '내 강의자료로만 답하는 질문·답변, 출처 표시', free: false, premium: true },
  { icon: 'quiz', name: '시험 대비 팩', desc: '요약 노트 · 예상 문제 · 암기 카드 · 개념 지도 자동 생성', free: false, premium: true },
  { icon: 'local_fire_department', name: '1분 퀴즈 · 연속 학습', free: true, premium: true },
];

const today = () => store.today();

export function isPremium() {
  return store.get().plan === 'premium';
}

export function usedToday() {
  const u = store.get().usage || {};
  return u.date === today() ? u.count : 0;
}

export function remaining() {
  return isPremium() ? Infinity : Math.max(0, FREE_DAILY_FILES - usedToday());
}

export function canAnalyze() {
  return remaining() > 0;
}

export function recordAnalysis() {
  store.set({ usage: { date: today(), count: usedToday() + 1 } });
}

export function setPremium(on) {
  store.set({ plan: on ? 'premium' : 'free' });
}
