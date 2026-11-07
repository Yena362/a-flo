// 프리미엄 학습 도구 화면에서 쓰는 함수 + 학습 자료 보관
import { MAX_SOURCES, MAX_SOURCES_TEXT } from './study-prompt.js';

export { MAX_SOURCES, MAX_SOURCES_TEXT };

export async function study(mode, { sources, question, history } = {}, { timeoutMs = 190000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('/api/study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, sources: sources.map(s => ({ name: s.name, text: s.text })), question, history }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.result) throw new Error(data.error || `AI 서버 응답 오류 (${res.status})`);
    return data.result;
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'AI 응답이 너무 오래 걸려요. 자료를 줄이거나 잠시 후 다시 시도해 주세요.' : e.message);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 학습 자료 보관 (이 브라우저) ----------
const KEY = 'aflo:notebook';
let memory = null; // 저장 공간이 부족할 때 이번 방문 동안만 보관

export function loadNotebook() {
  if (memory) return memory;
  try {
    memory = { sources: [], results: {}, chat: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    memory = { sources: [], results: {}, chat: [] };
  }
  return memory;
}

// 저장에 실패하면 false (기기 저장 공간 부족)
export function saveNotebook(patch) {
  memory = { ...loadNotebook(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
    return true;
  } catch {
    return false;
  }
}

export function sourcesKey(sources) {
  return sources.map(s => `${s.id}:${s.text.length}`).join('|');
}
