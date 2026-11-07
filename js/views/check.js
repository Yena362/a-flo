// STEP 1. 과제 & 교수님 맞춤 정보 입력: 성향 태그, 구두 지시사항(텍스트·음성), 파일 업로드
import { topbar, tabbar, esc, toast } from '../ui.js';
import { TAGS } from '../analyzer.js';
import { readAssignmentFile } from '../docx.js';
import { SAMPLE } from '../sample.js';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default {
  render({ store }) {
    const d = store.get().draft || {};
    const tags = new Set(d.tags || []);
    return `${topbar('과제 검사')}
    <form class="stack" id="check-form" novalidate>
      <section class="card stack">
        <label class="field"><span class="label">과제 이름</span>
          <input name="title" type="text" placeholder="예: 거시경제학 기말 리포트" value="${esc(d.title || '')}"></label>
      </section>

      <section class="card stack">
        <h2 class="h3">교수님 스타일 <span class="muted small">해당하는 것을 모두 골라 주세요</span></h2>
        <div class="chips" role="group" aria-label="교수님 성향">
          ${TAGS.map(t => `<button type="button" class="chip ${tags.has(t.id) ? 'on' : ''}" data-tag="${t.id}" aria-pressed="${tags.has(t.id)}">${esc(t.label)}</button>`).join('')}
        </div>
      </section>

      <section class="card stack">
        <div class="row-between">
          <label class="h3" for="instructions">수업 때 하신 말씀</label>
          <button type="button" class="btn-icon" id="mic" aria-label="음성으로 입력" ${SR ? '' : 'disabled title="이 브라우저는 음성 입력을 지원하지 않아요 (Chrome 권장)"'}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
          </button>
        </div>
        <textarea id="instructions" name="instructions" rows="3" placeholder="예: 참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것, 2,000자 이상">${esc(d.instructions || '')}</textarea>
        <p class="small muted" id="mic-status" aria-live="polite">${SR ? '마이크를 눌러 짧게 말하면 자동으로 적어 드려요.' : ''}</p>
        <label class="field inline"><span class="label">요구 분량</span>
          <input name="targetLength" type="number" min="0" step="100" inputmode="numeric" placeholder="자동" value="${d.targetLength || ''}"><span class="small muted">자 (비우면 말씀에서 찾아요)</span></label>
      </section>

      <section class="card stack">
        <h2 class="h3">과제 파일</h2>
        <label class="drop" id="drop">
          <input type="file" id="file" accept=".docx,.txt,.md,.pdf,.hwp,.hwpx" class="sr">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 15V5m0 0l-4 4m4-4l4 4M5 19h14"/></svg>
          <span><b>파일을 끌어다 놓거나 눌러서 선택</b><span class="small muted">DOCX · TXT (PDF·HWP는 준비 중)</span></span>
        </label>
        <label class="label" for="text">또는 내용 붙여 넣기</label>
        <textarea id="text" name="text" rows="8" placeholder="과제 본문과 참고문헌을 붙여 넣으세요.">${esc(d.text || '')}</textarea>
        <div class="row-between small"><button type="button" class="link" id="sample">예시 과제 불러오기</button><span class="muted" id="count">0자</span></div>
      </section>

      <button class="btn primary big" id="submit" type="submit">분석 시작</button>
    </form>
    ${tabbar('check')}`;
  },

  mount(root, { store, session, go }) {
    const form = root.querySelector('#check-form');
    const text = form.querySelector('#text');
    const count = form.querySelector('#count');
    const submit = form.querySelector('#submit');
    const update = () => {
      count.textContent = `${text.value.replace(/\s+/g, ' ').trim().length.toLocaleString()}자`;
      submit.disabled = text.value.trim().length < 20;
    };
    text.addEventListener('input', update);
    update();

    form.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
      const on = !c.classList.contains('on');
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', on);
    }));

    const loadFile = async file => {
      if (!file) return;
      try {
        text.value = await readAssignmentFile(file);
        if (!form.title.value) form.title.value = file.name.replace(/\.[^.]+$/, '');
        update();
        toast(`${file.name} 불러오기 완료`);
      } catch (e) {
        toast(e.message);
      }
    };
    const drop = form.querySelector('#drop');
    form.querySelector('#file').addEventListener('change', e => loadFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

    form.querySelector('#sample').addEventListener('click', () => {
      form.title.value = '거시경제학 기말 리포트 (예시)';
      form.instructions.value = SAMPLE.instructions;
      text.value = SAMPLE.text;
      form.querySelectorAll('.chip').forEach(c => {
        const on = SAMPLE.tags.includes(c.dataset.tag);
        c.classList.toggle('on', on);
        c.setAttribute('aria-pressed', on);
      });
      update();
    });

    // 음성 입력 (Web Speech API)
    let rec = null;
    const mic = form.querySelector('#mic');
    const status = form.querySelector('#mic-status');
    if (SR) mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = false;
      rec.onresult = e => {
        const said = Array.from(e.results).map(r => r[0].transcript).join(' ');
        const ta = form.instructions;
        ta.value = (ta.value.trim() ? `${ta.value.trim()}, ` : '') + said;
      };
      rec.onerror = e => { status.textContent = `음성 인식 오류: ${e.error}`; };
      rec.onend = () => { rec = null; mic.classList.remove('rec'); status.textContent = '받아 적기 완료. 내용을 확인해 주세요.'; };
      rec.start();
      mic.classList.add('rec');
      status.textContent = '듣고 있어요… 다시 누르면 멈춰요.';
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (submit.disabled) return;
      const input = {
        title: form.title.value.trim(),
        tags: [...form.querySelectorAll('.chip.on')].map(c => c.dataset.tag),
        instructions: form.instructions.value.trim(),
        targetLength: Number(form.targetLength.value) || 0,
        text: text.value,
      };
      store.set({ draft: input });
      session.input = input;
      session.result = null;
      session.ai = null;
      session.aiError = null;
      go('loading');
    });

    return () => rec && rec.abort();
  },
};
