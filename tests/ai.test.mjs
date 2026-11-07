import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeWithGemini, POST, GET, AIError } from '../api/analyze.js';
import { mergeAI } from '../js/ai-merge.js';
import { analyze } from '../js/analyzer.js';
import { SAMPLE } from '../js/sample.js';

// 진짜 Gemini 대신 쓰는 가짜 답변
const FAKE_AI = {
  topicFit: { score: 20, comment: '주제는 맞지만 근거가 부족해요.' },
  logic: { score: 22, comment: '전개는 자연스러워요.' },
  aiLikelihood: 30,
  summary: '근거만 보강하면 훨씬 좋아질 거야!',
  instructionChecks: [
    { instruction: '참고문헌 APA 필수', met: false, evidence: '연도 괄호가 빠졌어요.' },
    { instruction: '서론에 뉴스 기사 인용', met: false, evidence: '서론에 기사가 없어요.' },
  ],
  issues: [
    { quote: '기업 입장에서도 자금 조달 비용이 높아지면 신규 투자를 미루게 된다.', severity: 'warning', category: 'style', title: '근거 부족', reason: '주장만 있고 근거가 없어요.', suggestion: '사례를 덧붙이세요.', fix: '' },
    { quote: '원문에 없는 문장', severity: 'danger', category: 'instruction', title: '가짜 인용', reason: 'x', suggestion: 'x', fix: 'x' },
    { quote: '', severity: 'danger', category: 'instruction', title: '결론 약함', reason: '결론이 한 문장뿐이에요.', suggestion: '요약과 제언을 쓰세요.', fix: '' },
  ],
};

function fakeFetch(captured, { status = 200, payload } = {}) {
  return async (url, init) => {
    captured.url = url;
    captured.init = init;
    const body = payload ?? { candidates: [{ content: { parts: [{ text: 'thinking...', thought: true }, { text: JSON.stringify(FAKE_AI) }] } }] };
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
}

test('Gemini 요청 형식: 키는 헤더로, JSON 스키마 강제', async () => {
  const cap = {};
  const ai = await gradeWithGemini(SAMPLE, { apiKey: 'k-123', model: 'gemini-3.8-flash', fetchImpl: fakeFetch(cap) });
  assert.match(cap.url, /models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(cap.init.headers['x-goog-api-key'], 'k-123');
  assert.ok(!cap.url.includes('k-123'), '키가 URL에 노출되면 안 됨');
  const body = JSON.parse(cap.init.body);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.ok(body.generationConfig.responseJsonSchema.required.includes('issues'));
  assert.ok(body.contents[0].parts[0].text.includes('서론에 뉴스 기사 인용할 것'));
  assert.ok(body.contents[0].parts[0].text.includes('APA 양식 아님'), '규칙 엔진 결과를 함께 전달');
  assert.equal(ai.summary, FAKE_AI.summary, 'thought 파트는 무시하고 답변만 파싱');
});

test('키가 없거나, 글이 짧거나, 한도 초과면 알아듣기 쉬운 오류', async () => {
  await assert.rejects(gradeWithGemini(SAMPLE, {}), e => e instanceof AIError && e.status === 500);
  await assert.rejects(gradeWithGemini({ text: '짧음' }, { apiKey: 'k' }), e => e.status === 400);
  await assert.rejects(
    gradeWithGemini(SAMPLE, { apiKey: 'k', fetchImpl: fakeFetch({}, { status: 429, payload: { error: { message: 'quota' } } }) }),
    e => e.status === 429 && /한도/.test(e.message),
  );
  await assert.rejects(
    gradeWithGemini(SAMPLE, { apiKey: 'k', fetchImpl: fakeFetch({}, { payload: { candidates: [{ content: { parts: [{ text: 'not json' }] } }] } }) }),
    e => /형식/.test(e.message),
  );
});

test('POST /api/analyze: 키가 없으면 500과 안내 문구', async () => {
  delete process.env.GEMINI_API_KEY;
  const res = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(SAMPLE) }));
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /GEMINI_API_KEY/);
});

test('POST /api/analyze: 허용되지 않은 사이트는 차단', async () => {
  process.env.ALLOWED_ORIGINS = 'https://a-flo.vercel.app';
  const res = await POST(new Request('http://localhost/api/analyze', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }));
  assert.equal(res.status, 403);
  delete process.env.ALLOWED_ORIGINS;
});

test('합치기: 형식 점수는 규칙, 내용 점수는 AI 반영', () => {
  const rule = analyze(SAMPLE);
  const r = mergeAI(rule, FAKE_AI, SAMPLE.text);
  const get = (res, k) => res.rubric.find(x => x.key === k).score;
  assert.equal(r.source, 'ai');
  assert.equal(get(r, 'citation'), get(rule, 'citation'));
  assert.equal(get(r, 'length'), get(rule, 'length'));
  assert.equal(get(r, 'instruction'), Math.min(get(rule, 'instruction'), 20));
  assert.equal(get(r, 'style'), Math.round((get(rule, 'style') + 22) / 2));
  assert.equal(r.score, r.rubric.reduce((s, x) => s + x.score, 0));
  assert.ok(r.plagiarism.rate >= rule.plagiarism.rate);
  assert.equal(r.checklist.length, 2);
  assert.equal(r.checklist[0].met, false);
});

test('합치기: AI 지적은 원문 위치를 찾고, 원문에 없는 인용은 버림', () => {
  const r = mergeAI(analyze(SAMPLE), FAKE_AI, SAMPLE.text);
  const ai = r.issues.filter(i => i.source === 'ai');
  assert.deepEqual(ai.map(i => i.title).sort(), ['결론 약함', '근거 부족']);
  const g = ai.find(i => i.title === '근거 부족');
  assert.equal(SAMPLE.text.slice(g.start, g.end), FAKE_AI.issues[0].quote);
  assert.equal(g.fix, null, '수정 문장이 비어 있으면 자동 적용 버튼 없음');
  assert.equal(ai.find(i => i.title === '결론 약함').start, -1);
});

test('AI 없이도 규칙 결과 그대로', () => {
  const rule = analyze(SAMPLE);
  const r = mergeAI(rule, null, SAMPLE.text);
  assert.equal(r.source, 'rules');
  assert.equal(r.score, rule.score);
});

test('GET /api/analyze: 상태 확인, 키 값은 노출하지 않음', async () => {
  process.env.GEMINI_API_KEY = 'secret-key-value';
  const body = await GET().json();
  assert.equal(body.ok, true);
  assert.equal(body.keySet, true);
  assert.ok(!JSON.stringify(body).includes('secret-key-value'));
  delete process.env.GEMINI_API_KEY;
});
