// Vercel 서버 함수: POST /api/study — 프리미엄 학습 도구 (자료 노트북 · 시험 대비 팩)
// 요청: { mode: 'ask'|'summary'|'quiz'|'cards'|'map', sources: [{ name, text }], question?, history? }
import { STUDY_SYSTEM, SCHEMAS, buildStudyPrompt, MAX_SOURCES, MAX_SOURCES_TEXT } from '../js/study-prompt.js';
import { callGemini, AIError, DEFAULT_MODEL, corsHeaders, preflight } from './_gemini.js';

const OUTPUT_TOKENS = { ask: 2048, summary: 8192, quiz: 4096, cards: 4096, map: 4096 };

export function validate(body) {
  const mode = body?.mode;
  if (!SCHEMAS[mode]) throw new AIError('알 수 없는 기능이에요.', 400);
  const sources = Array.isArray(body.sources) ? body.sources.filter(s => s && typeof s.text === 'string' && s.text.trim()) : [];
  if (!sources.length) throw new AIError('학습 자료를 먼저 올려 주세요.', 400);
  if (sources.length > MAX_SOURCES) throw new AIError(`자료는 ${MAX_SOURCES}개까지 넣을 수 있어요.`, 400);
  const total = sources.reduce((n, s) => n + s.text.length, 0);
  if (total > MAX_SOURCES_TEXT) throw new AIError(`자료가 너무 많아요. 전체 ${MAX_SOURCES_TEXT.toLocaleString()}자 이하로 줄여 주세요.`, 413);
  const question = String(body.question || '').trim().slice(0, 1000);
  if (mode === 'ask' && !question) throw new AIError('질문을 입력해 주세요.', 400);
  const history = Array.isArray(body.history) ? body.history.slice(-4).map(h => ({ q: String(h.q || '').slice(0, 500), a: String(h.a || '').slice(0, 1500) })) : [];
  return { mode, sources: sources.map(s => ({ name: String(s.name || ''), text: s.text })), question, history };
}

export async function runStudy(body, { apiKey, model = DEFAULT_MODEL, fetchImpl = fetch } = {}) {
  const req = validate(body);
  return callGemini({
    system: STUDY_SYSTEM,
    prompt: buildStudyPrompt(req),
    schema: SCHEMAS[req.mode],
    apiKey, model, fetchImpl,
    maxOutputTokens: OUTPUT_TOKENS[req.mode],
  });
}

export const OPTIONS = preflight;

export async function POST(request) {
  const cors = corsHeaders(request);
  if (!cors) return Response.json({ error: '허용되지 않은 사이트에서 온 요청이에요.' }, { status: 403 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400, headers: cors });
  }
  try {
    const result = await runStudy(body, { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || DEFAULT_MODEL });
    return Response.json({ result }, { headers: cors });
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500;
    return Response.json({ error: e instanceof AIError ? e.message : '서버 오류가 났어요.' }, { status, headers: cors });
  }
}
