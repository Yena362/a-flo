// 서버 전용: Gemini 호출 공통 코드 (파일 이름이 _로 시작해서 Vercel이 주소로 공개하지 않음)
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class AIError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

// system: 지시문, prompt: 사용자 내용, schema: 답변 JSON 형식
export async function callGemini({ system, prompt, schema, apiKey, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 170000, maxOutputTokens = 4096 }) {
  if (!apiKey) throw new AIError('서버에 GEMINI_API_KEY가 설정되지 않았어요.', 500);
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens },
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

export function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) return null;
  return origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
}

export function preflight(request) {
  const cors = corsHeaders(request);
  if (!cors) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
