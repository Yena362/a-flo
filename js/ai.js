// 화면에서 쓰는 함수: 규칙 엔진 + Gemini 채점을 한 번에
//
//   import { analyzeWithAI } from './js/ai.js';
//   const { result, error } = await analyzeWithAI(input);
//
// AI가 실패해도(키 없음, 한도 초과, 인터넷 끊김) 규칙 엔진 결과는 항상 돌려준다.
// result.source 가 'ai' 면 AI까지 반영된 것, 'rules' 면 규칙 엔진만 쓴 것.

import { analyze } from './analyzer.js';
import { mergeAI } from './ai-merge.js';

export async function analyzeWithAI(input, { endpoint = '/api/analyze', timeoutMs = 60000 } = {}) {
  const rule = analyze(input);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.text, tags: input.tags, instructions: input.instructions, targetLength: input.targetLength,
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ai) throw new Error(data.error || `AI 서버 응답 오류 (${res.status})`);
    return { result: mergeAI(rule, data.ai, input.text), ai: data.ai, model: data.model, error: null };
  } catch (e) {
    const error = e.name === 'AbortError' ? 'AI 응답이 늦어 기본 채점만 보여 드려요.' : e.message;
    return { result: mergeAI(rule, null, input.text), ai: null, error };
  } finally {
    clearTimeout(timer);
  }
}

// 교정 에디터에서 수정안을 적용한 뒤: AI를 다시 부르지 않고(비용 절약) 이전 AI 결과를 새 원문에 다시 맞춘다
export function reapply(input, ai) {
  return mergeAI(analyze(input), ai, input.text);
}
