// Vercel 서버 함수: POST /api/analyze
// 브라우저 대신 이 서버가 Gemini를 부른다. 그래서 API 키가 사용자에게 노출되지 않는다.
//
// Vercel 환경 변수
//   GEMINI_API_KEY   (필수) Google AI Studio에서 받은 키
//   GEMINI_MODEL     (선택) 기본 gemini-3.5-flash-lite(빠르고 저렴). 채점 품질을 높이려면 gemini-3.8-flash
//   ALLOWED_ORIGINS  (선택) 우리 사이트 주소만 허용하려면 쉼표로 나열. 예: https://a-flo.vercel.app

import { analyze } from '../js/analyzer.js';
import { SYSTEM, SCHEMA, buildPrompt, MAX_TEXT } from '../js/ai-prompt.js';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class AIError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

// 실제 채점 로직 (테스트·로컬 스크립트에서도 그대로 씀)
export async function gradeWithGemini(input, { apiKey, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 50000 } = {}) {
  if (!apiKey) throw new AIError('서버에 GEMINI_API_KEY가 설정되지 않았어요.', 500);
  const text = String(input?.text || '');
  if (text.trim().length < 20) throw new AIError('과제 내용이 너무 짧아요.', 400);
  if (text.length > MAX_TEXT) throw new AIError(`과제가 너무 길어요. ${MAX_TEXT.toLocaleString()}자 이하로 나눠서 검사해 주세요.`, 413);

  const ruleResult = analyze(input);
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(input, ruleResult) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: SCHEMA,
      maxOutputTokens: 4096,
    },
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new AIError(e.name === 'AbortError' ? 'AI 응답이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.' : 'AI 서버에 연결하지 못했어요.', 504);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    if (res.status === 429) throw new AIError('AI 사용량 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.', 429);
    if (res.status === 400 || res.status === 403) throw new AIError(`AI 요청이 거절됐어요 (키·모델 이름 확인): ${msg}`, 502);
    throw new AIError(`AI 오류: ${msg}`, 502);
  }
  if (data?.promptFeedback?.blockReason) throw new AIError('AI가 이 내용의 처리를 거절했어요.', 422);

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const out = parts.filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
  try {
    return JSON.parse(out);
  } catch {
    throw new AIError('AI 답변 형식이 올바르지 않아요. 다시 시도해 주세요.', 502);
  }
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) return null;
  return origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
}

// 브라우저로 열어 보는 상태 확인용 (키 값은 절대 보여 주지 않음)
export function GET() {
  return Response.json({
    ok: true,
    service: '에이플로 AI 채점 서버',
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    keySet: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function OPTIONS(request) {
  const cors = corsHeaders(request);
  if (!cors) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function POST(request) {
  const cors = corsHeaders(request);
  if (!cors) return Response.json({ error: '허용되지 않은 사이트에서 온 요청이에요.' }, { status: 403 });
  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400, headers: cors });
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  try {
    const ai = await gradeWithGemini(input, { apiKey: process.env.GEMINI_API_KEY, model });
    return Response.json({ ai, model }, { headers: cors });
  } catch (e) {
    const status = e instanceof AIError ? e.status : 500;
    return Response.json({ error: e instanceof AIError ? e.message : '서버 오류가 났어요.' }, { status, headers: cors });
  }
}
