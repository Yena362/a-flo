// 유니버설 접근성: 글자 크기 · 고대비 · 화면 읽어주기
// 설정은 이 기기에만 저장돼요. 버튼은 ui.js 상단 바의 "접근성" 메뉴에 있어요.
export const SCALES = [0.9, 1, 1.15, 1.3];
const KEY = 'aflo-a11y';

export function a11ySettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { scale: SCALES[s.scale] ? s.scale : 1, contrast: !!s.contrast };
  } catch { return { scale: 1, contrast: false }; }
}

function save(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장이 안 돼도 이번 화면에는 적용돼요 */ }
  apply(next);
}

export function apply(s = a11ySettings()) {
  const html = document.documentElement;
  html.style.setProperty('--a11y-zoom', SCALES[s.scale]);
  html.classList.toggle('hc', s.contrast);
}

// 화면 본문을 한국어 음성으로 읽어 줘요. 교정 화면에서는 과제 본문만 읽어요.
function speak(btn) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  if (synth.speaking) { synth.cancel(); return; }
  const app = document.getElementById('app');
  const target = app.querySelector('.pane-doc .lines') || app;
  const clone = target.cloneNode(true);
  clone.querySelectorAll('.ms, .topbar, .tabbar, .a11y, .note, .no, button').forEach(n => n.remove());
  const text = clone.innerText.replace(/\s+\n/g, '\n').trim();
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text.slice(0, 4000));
  u.lang = 'ko-KR';
  u.rate = 1;
  const set = on => { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('span:last-child').textContent = on ? '읽기 멈추기' : '이 화면 읽어주기'; };
  u.onend = u.onerror = () => set(false);
  set(true);
  synth.speak(u);
}

export function initA11y() {
  apply();
  // 화면이 다시 그려져도 동작하도록 문서 전체에서 클릭을 받아요
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a11y]');
    if (!b) return;
    const s = a11ySettings();
    const act = b.dataset.a11y;
    if (act === 'read') { speak(b); return; }
    if (act === 'bigger') s.scale = Math.min(SCALES.length - 1, s.scale + 1);
    if (act === 'smaller') s.scale = Math.max(0, s.scale - 1);
    if (act === 'contrast') s.contrast = !s.contrast;
    save(s);
    const pop = b.closest('.a11y-pop');
    if (pop) {
      pop.querySelector('[aria-live]').textContent = `${Math.round(SCALES[s.scale] * 100)}%`;
      const c = pop.querySelector('[data-a11y="contrast"]');
      c.setAttribute('aria-pressed', String(s.contrast));
      c.lastChild.textContent = `고대비 ${s.contrast ? '켜짐' : '꺼짐'}`;
    }
  });
  // 메뉴 밖을 누르거나 Esc를 누르면 닫혀요
  document.addEventListener('click', e => {
    document.querySelectorAll('details.a11y[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('details.a11y[open]').forEach(d => { d.open = false; d.querySelector('summary').focus(); });
  });
  window.addEventListener('hashchange', () => window.speechSynthesis?.cancel());
}
