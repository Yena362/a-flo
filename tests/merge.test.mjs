import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeState, toCloud } from '../js/merge.js';

const base = { mascot: 'chick', streak: 0, best: 0, lastSolved: null, credits: 3, quizToday: {}, history: [], draft: null, updatedAt: 0 };

test('클라우드가 비어 있으면 기기 기록 그대로', () => {
  const local = { ...base, streak: 2 };
  assert.deepEqual(mergeState(local, null), local);
});

test('더 최근에 바뀐 쪽의 연속 일수·검사권을 따라간다', () => {
  const local = { ...base, streak: 1, credits: 4, updatedAt: 100 };
  const cloud = { ...base, streak: 5, credits: 9, updatedAt: 200 };
  const m = mergeState(local, cloud);
  assert.equal(m.streak, 5);
  assert.equal(m.credits, 9);
});

test('최고 기록은 둘 중 큰 값', () => {
  const m = mergeState({ ...base, best: 7, updatedAt: 200 }, { ...base, best: 3, updatedAt: 100 });
  assert.equal(m.best, 7);
  const m2 = mergeState({ ...base, best: 1, updatedAt: 300 }, { ...base, best: 6, updatedAt: 100 });
  assert.equal(m2.best, 6);
});

test('검사 기록은 합치고 중복 제거, 최신순 20개', () => {
  const a = { date: '2026-11-05', title: 'A', score: 70, grade: 'C' };
  const b = { date: '2026-11-07', title: 'B', score: 80, grade: 'B' };
  const m = mergeState({ ...base, history: [a], updatedAt: 1 }, { ...base, history: [a, b], updatedAt: 2 });
  assert.deepEqual(m.history, [b, a]);

  const many = Array.from({ length: 30 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, title: `t${i}`, score: i, grade: 'B' }));
  assert.equal(mergeState({ ...base, history: many, updatedAt: 1 }, { ...base, updatedAt: 2 }).history.length, 20);
});

test('퀴즈 기록은 합쳐진다', () => {
  const m = mergeState(
    { ...base, quizToday: { 'd1:assignment': { done: true } }, updatedAt: 1 },
    { ...base, quizToday: { 'd1:exam': { done: true } }, updatedAt: 2 },
  );
  assert.deepEqual(Object.keys(m.quizToday).sort(), ['d1:assignment', 'd1:exam']);
});

test('경험치는 둘 중 큰 값, 보상 받은 퀴즈는 합쳐진다', () => {
  const m = mergeState(
    { ...base, xp: 40, gems: 5, rewarded: { 'd1:exam': true }, updatedAt: 300 },
    { ...base, xp: 90, gems: 2, rewarded: { 'd1:assignment': true }, updatedAt: 100 },
  );
  assert.equal(m.xp, 90);
  assert.equal(m.gems, 5); // 다이아는 더 최근 쪽
  assert.deepEqual(Object.keys(m.rewarded).sort(), ['d1:assignment', 'd1:exam']);
});

test('클라우드로 보낼 때 과제 원문(draft)과 요금제(plan)는 뺀다', () => {
  const sent = toCloud({ ...base, draft: { text: '비공개 과제' }, plan: 'premium', streak: 3 });
  assert.equal('draft' in sent, false);
  assert.equal('plan' in sent, false);
  assert.equal(sent.streak, 3);
});

test('클라우드 기록과 합쳐도 기기의 요금제는 그대로 남는다', () => {
  const local = { ...base, plan: 'premium', draft: { text: 'x' }, updatedAt: 1 };
  // 클라우드 문서가 직접 고쳐져 plan·draft가 들어 있어도 cloud.js는 toCloud로 걸러서 합쳐요
  const tampered = { ...base, streak: 4, plan: 'premium-hacked', draft: { text: '바꿔치기' }, updatedAt: 2 };
  const merged = mergeState(toCloud(local), toCloud(tampered));
  const applied = { ...local, ...merged }; // cloud.js의 store.replace 입력과 같은 모양
  assert.equal(applied.plan, 'premium');
  assert.deepEqual(applied.draft, { text: 'x' });
  assert.equal(applied.streak, 4);
});
