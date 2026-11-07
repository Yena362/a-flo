// 강의 받아 적기: 말소리를 실시간으로 글자로 바꿔 자료 노트북에 넣는다 (다글로 같은 기능)
// - 브라우저 내장 음성 인식(Web Speech API)을 사용 → 따로 서버나 API 키가 필요 없음
// - Chrome·Edge·Safari 지원, 인터넷 연결 필요
// - 받아 적은 글은 문장마다 [분:초] 시간을 붙이고, 새로고침해도 날아가지 않게 이 기기에 임시 저장
// - 화면을 다시 그려도 녹음이 끊기지 않도록 상태를 모듈에 둔다

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const KEY = 'aflo:rec';

export const canRecord = !!SR;

let rec = null;
let state = null; // { text, startedAt, elapsedBefore, resumedAt, interim, recording, error }
const listeners = new Set();

const emit = () => listeners.forEach(f => f(state));
export const onRec = f => { listeners.add(f); return () => listeners.delete(f); };

function saveDraft() {
  try { localStorage.setItem(KEY, JSON.stringify({ text: state.text, startedAt: state.startedAt, elapsed: elapsedMs() })); } catch { /* 저장 불가 */ }
}

function clearDraft() {
  try { localStorage.removeItem(KEY); } catch { /* 저장 불가 */ }
}

// 지금 받아 적기 상태 (새로고침 전에 저장 안 하고 남은 것도 불러옴)
export function recState() {
  if (state) return state;
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d?.text) {
      state = { text: d.text, startedAt: d.startedAt, elapsedBefore: d.elapsed || 0, resumedAt: null, interim: '', recording: false, error: null };
      return state;
    }
  } catch { /* 무시 */ }
  return null;
}

export function elapsedMs() {
  if (!state) return 0;
  return state.elapsedBefore + (state.recording && state.resumedAt ? Date.now() - state.resumedAt : 0);
}

export const clock = ms => {
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const z = n => String(n).padStart(2, '0');
  return h ? `${h}:${z(m)}:${z(s)}` : `${z(m)}:${z(s)}`;
};

export function startRec() {
  if (!SR) return;
  const prev = recState();
  state = { text: prev?.text || '', startedAt: prev?.startedAt || Date.now(), elapsedBefore: prev?.elapsedBefore || 0, resumedAt: Date.now(), interim: '', recording: true, error: null };
  let fails = 0;

  const go = () => {
    rec = new SR();
    rec.lang = 'ko-KR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      fails = 0;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const said = r[0].transcript.trim();
        if (!said) continue;
        if (r.isFinal) {
          state.text += `${state.text ? '\n' : ''}[${clock(elapsedMs())}] ${said}`;
          saveDraft();
        } else interim += said;
      }
      state.interim = interim;
      emit();
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') state.error = '마이크 사용을 허용해 주세요. 주소창 왼쪽 자물쇠 → 마이크 → 허용';
      else if (e.error === 'audio-capture') state.error = '마이크를 찾지 못했어요. 마이크 연결을 확인해 주세요.';
      else if (e.error === 'network') fails++;
      if (state.error) pause();
      emit();
    };
    // 브라우저는 조용한 구간이 길면 인식을 스스로 끝냄 → 녹음 중이면 자동으로 다시 켠다
    rec.onend = () => {
      if (!state?.recording) return;
      if (fails >= 3) { state.error = '인터넷 연결이 불안정해서 받아 적기를 멈췄어요. 연결을 확인하고 이어서 받아 적기를 눌러 주세요.'; pause(); emit(); return; }
      setTimeout(() => { if (state?.recording) { try { go(); } catch { /* 이미 켜짐 */ } } }, fails ? 1000 : 50);
    };
    rec.start();
  };

  try { go(); } catch (e) { state.error = `받아 적기를 시작하지 못했어요: ${e.message}`; state.recording = false; }
  emit();
}

function pause() {
  if (!state) return;
  if (state.recording && state.resumedAt) state.elapsedBefore += Date.now() - state.resumedAt;
  state.recording = false;
  state.resumedAt = null;
  state.interim = '';
  saveDraft();
}

export function stopRec() {
  pause();
  try { rec?.stop(); } catch { /* 이미 멈춤 */ }
  rec = null;
  emit();
}

// 저장하거나 버리면 상태를 비운다. 저장할 글을 돌려줌
export function finishRec() {
  stopRec();
  const out = state ? { text: state.text, startedAt: state.startedAt } : null;
  state = null;
  clearDraft();
  emit();
  return out;
}
