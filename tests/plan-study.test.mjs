import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../js/store.js';
import { canAnalyze, recordAnalysis, remaining, setPremium, FREE_DAILY_FILES } from '../js/plan.js';
import { runStudy, validate, POST } from '../api/study.js';
import { buildStudyPrompt, SCHEMAS, MAX_SOURCES_TEXT } from '../js/study-prompt.js';

test('무료: 하루 2개까지, 날짜가 바뀌면 다시 2개', () => {
  setPremium(false);
  store.set({ usage: {} });
  assert.equal(FREE_DAILY_FILES, 2);
  assert.equal(remaining(), 2);
  recordAnalysis(); assert.equal(canAnalyze(), true); assert.equal(remaining(), 1);
  recordAnalysis(); assert.equal(canAnalyze(), false); assert.equal(remaining(), 0);
  store.set({ usage: { date: '2000-01-01', count: 99 } });
  assert.equal(remaining(), 2, '어제 사용량은 오늘에 영향 없음');
});

test('프리미엄: 무제한', () => {
  setPremium(true);
  for (let i = 0; i < 10; i++) recordAnalysis();
  assert.equal(canAnalyze(), true);
  assert.equal(remaining(), Infinity);
  setPremium(false);
});

const SOURCES = [{ name: '3주차 강의.pdf', text: '수요의 가격탄력성은 가격 변화율에 대한 수요량 변화율의 비율이다.' }, { name: '필기', text: '기회비용은 포기한 대안 중 가장 큰 가치이다.' }];

function fakeFetch(cap, result) {
  return async (url, init) => {
    cap.url = url; cap.body = JSON.parse(init.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] }));
  };
}

test('질문하기: 자료 번호를 붙여 보내고 출처 형식으로 받음', async () => {
  const cap = {};
  const answer = { found: true, answer: '가격 변화율 대비 수요량 변화율이에요.', citations: [{ source: 1, quote: '수요의 가격탄력성은' }], followUps: ['a', 'b', 'c'] };
  const r = await runStudy({ mode: 'ask', sources: SOURCES, question: '가격탄력성이 뭐야?' }, { apiKey: 'k', fetchImpl: fakeFetch(cap, answer) });
  assert.deepEqual(r, answer);
  const prompt = cap.body.contents[0].parts[0].text;
  assert.match(prompt, /<<<자료 1: 3주차 강의\.pdf>>>/);
  assert.match(prompt, /<<<자료 2: 필기>>>/);
  assert.match(prompt, /가격탄력성이 뭐야\?/);
  assert.deepEqual(cap.body.generationConfig.responseJsonSchema, SCHEMAS.ask);
  assert.match(cap.body.systemInstruction.parts[0].text, /자료에 없는 내용은 지어내지 않는다/);
});

test('시험 대비 팩: 기능마다 다른 답변 형식', async () => {
  for (const mode of ['summary', 'quiz', 'cards', 'map']) {
    const cap = {};
    await runStudy({ mode, sources: SOURCES }, { apiKey: 'k', fetchImpl: fakeFetch(cap, { ok: 1 }) });
    assert.deepEqual(cap.body.generationConfig.responseJsonSchema, SCHEMAS[mode], mode);
  }
});

test('잘못된 요청은 쉬운 말로 거절', () => {
  assert.throws(() => validate({ mode: 'hack', sources: SOURCES }), /알 수 없는 기능/);
  assert.throws(() => validate({ mode: 'summary', sources: [] }), /자료를 먼저/);
  assert.throws(() => validate({ mode: 'ask', sources: SOURCES, question: '  ' }), /질문을 입력/);
  assert.throws(() => validate({ mode: 'summary', sources: [{ name: 'big', text: 'x'.repeat(MAX_SOURCES_TEXT + 1) }] }), /너무 많아요/);
  assert.throws(() => validate({ mode: 'summary', sources: Array.from({ length: 11 }, (_, i) => ({ name: `${i}`, text: 'abc' })) }), /10개까지/);
});

test('대화 기록은 최근 4개만 프롬프트에 포함', () => {
  const history = Array.from({ length: 6 }, (_, i) => ({ q: `질문${i}`, a: `답${i}` }));
  const p = buildStudyPrompt({ mode: 'ask', sources: SOURCES, question: '다음 질문', history });
  assert.ok(!p.includes('질문1\n') && p.includes('질문5'));
});

test('POST /api/study: 키가 없으면 500 안내', async () => {
  delete process.env.GEMINI_API_KEY;
  const res = await POST(new Request('http://x/api/study', { method: 'POST', body: JSON.stringify({ mode: 'summary', sources: SOURCES }) }));
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /GEMINI_API_KEY/);
});
