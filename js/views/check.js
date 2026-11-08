// 과제 검사: ① 과제 올리기(필수) → ② 교수님 스타일(선택) → ③ 수업 지시사항(선택) → 검사 시작
// 넓은 화면은 오른쪽에 '준비 상태' 패널, 휴대폰은 하단 고정 버튼 바로 보여요.
import { topbar, tabbar, icon, esc, toast } from '../ui.js';
import { mascot, CHARACTERS } from '../mascot.js';
import { TAGS } from '../analyzer.js';
import { analyzeWithAI } from '../ai.js';
import { readAssignmentFile } from '../docx.js';
import { SAMPLE } from '../sample.js';
import { isPremium, remaining, canAnalyze, recordAnalysis, FREE_DAILY_FILES } from '../plan.js';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const TAG_UI = {
  strict: ['fact_check', '맞춤법·사실 오류를 엄하게 봐요'],
  logic: ['lightbulb', '주장과 근거가 이어지는지 봐요'],
  cite: ['format_quote', '출처 표기·참고문헌 형식을 봐요'],
  structure: ['view_agenda', '서론·본론·결론 구성을 봐요'],
  length: ['straighten', '요구 분량을 지켰는지 봐요'],
};
const stepHead = (n, title, need, hint) => `<div class="step-head"><span class="step-no" aria-hidden="true">${n}</span><div class="grow"><h2 class="card-title">${title}<span class="need ${need ? 'req' : ''}">${need ? '필수' : '선택'}</span></h2>${hint ? `<p class="sm muted b" style="margin:2px 0 0">${hint}</p>` : ''}</div></div>`;
const STEPS = ['교수님 지시사항 분석', '표절 및 문단 대조', '감점 요소 추출', 'AI 내용·논리 평가'];
const MIN_MS = 3600;
const MAX_FILE_MB = 100;
const REPORT_XP = 30;

function fileCard(name, chars, kind = '') {
  return `<div class="file">${icon('description', 'fill doc')}<div class="grow"><b class="ellipsis">${esc(name)}</b><div class="sm muted b">${icon('check_circle', 'fill t-green')} ${kind ? `${esc(kind)} · ` : ''}${chars.toLocaleString()}자 · 불러오기 완료</div></div>
    <div class="file-acts"><label class="btn sm" for="file">${icon('refresh')}바꾸기</label><button type="button" class="btn sm danger-ghost" data-act="delete-file" aria-label="${esc(name)} 삭제">${icon('delete')}삭제</button></div></div>`;
}

function panel(session, s) {
  const phase = session.phase;
  if (!phase) return '';
  const r = session.result;
  const done = phase === 'done';
  const who = CHARACTERS[s.mascot]?.name || '코치';
  return `<section class="card tint scan" id="scan" aria-live="polite">
    <div class="row">
      <div class="hero-avatar sm">${mascot(s.mascot, done ? (r.mood === 'danger' ? 'danger' : 'cheer') : 'analyzing', 70, done ? '' : 'bob')}</div>
      <div class="grow">
        <h2 class="h3">${done ? `${who} 정밀 분석 완료!` : `${who}가 정밀 분석 중!`}</h2>
        <p class="sm muted b" style="margin:0">교수님 평가 기준과 대조 스캔</p>
      </div>
      <b class="h2" id="pct">${done ? 100 : 0}%</b>
    </div>
    <div class="progress" role="progressbar" aria-label="분석 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${done ? 100 : 0}"><div class="bar" id="bar" style="width:${done ? 100 : 0}%"></div></div>
    <ol class="steps" id="steps">
      ${STEPS.map((t, i) => `<li class="${done ? 'done' : i === 0 ? 'run' : 'wait'}">${icon(done ? 'check_circle' : i === 0 ? 'sync' : 'hourglass_top', 'fill')}<span>${t}</span><span class="st">${done ? '완료' : i === 0 ? '진행 중' : '대기'}</span></li>`).join('')}
    </ol>
    ${done ? `
      ${session.aiError ? `<p class="sm muted b" style="margin:0">${icon('info')} AI 채점 없이 기본 채점만 했어요 (${esc(session.aiError)})</p>` : ''}
      ${r.truncated ? `<p class="sm muted b" style="margin:0">${icon('info')} 글이 길어서 AI는 앞 ${r.truncated.toLocaleString()}자를 읽었어요. 형식 검사는 전체를 했어요.</p>` : ''}
      <div class="payoff">
        <div><span class="sm muted b">고치면 오르는 점수</span><div class="h2 t-green">+${r.potential.gain}점 · ${r.potential.grade} 가능</div></div>
        <span class="chip green">${icon('workspace_premium', 'fill')}지금 ${r.grade}</span>
      </div>
      <a class="btn green big" href="#/result">예상 ${r.grade} · 정밀 리포트 확인하기 ✨</a>
      <div class="chip orange" style="justify-content:center">${icon('local_fire_department', 'fill')}검사 완료 보너스! 경험치 +${REPORT_XP} XP 지급</div>` : ''}
  </section>`;
}

export default {
  render({ store, session }) {
    const s = store.get();
    const d = s.draft || {};
    const tags = new Set(d.tags || []);
    const running = session.phase === 'running';
    const left = isPremium() ? '' : `무료 ${remaining()}/${FREE_DAILY_FILES}회 남음`;
    return `${topbar()}
    <header class="page-head">
      <div class="hero-avatar sm">${mascot(s.mascot, 'quiz', 60, 'bob')}</div>
      <div class="grow">
        <h1 class="h1">과제 검사</h1>
        <p class="b muted" style="margin:2px 0 0">제출 전에 교수님 기준으로 감점 포인트를 찾아 드려요 · 약 30초</p>
      </div>
      ${isPremium() ? `<span class="chip ink">${icon('workspace_premium', 'fill')}프리미엄 · 무제한</span>` : `<a class="chip ${remaining() ? 'blue' : 'red'}" href="#/premium">${icon('confirmation_number')}오늘 ${left}</a>`}
    </header>
    ${!session.phase && s.history[0] && d.text?.trim() ? `<a class="card recent" href="#/result">${icon('history')}<div class="grow"><div class="xs muted b">지난 검사 결과 보기 · ${esc(s.history[0].date)}</div><b class="ellipsis">${esc(s.history[0].title || '제목 없는 과제')}</b></div><span class="chip green">${esc(s.history[0].grade)} · ${s.history[0].score}점</span>${icon('chevron_right')}</a>` : ''}

    <form class="check-layout" id="form" novalidate>
      <div class="check-steps">
        <section class="card stack" aria-labelledby="st1">
          ${stepHead(1, '<span id="st1">과제 올리기</span>', true, '파일을 올리거나 본문을 붙여 넣어 주세요.')}
          <div id="file-slot">${d.text ? fileCard(d.fileName || d.title || '불러온 과제', d.text.replace(/\s+/g, ' ').trim().length, d.fileKind) : ''}</div>
          <label class="drop big-drop" id="drop">
            <input type="file" id="file" accept=".hwp,.hwpx,.pdf,.docx,.pptx,.txt,.md,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp,application/vnd.hancom.hwpx,application/hwp+zip,application/octet-stream,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" class="sr">
            ${icon('upload_file')}
            <span><b>${d.text ? '다른 파일로 바꾸기' : '과제 파일 선택'}</b> <span class="sm muted drag-hint">또는 여기로 끌어다 놓기</span><br><span class="sm muted">한글(HWP·HWPX) · PDF · 워드(DOCX) · PPT · TXT</span></span>
          </label>
          <details class="paste" ${d.text ? '' : 'open'}>
            <summary id="paste-sum">${d.text ? '불러온 본문 확인·수정' : '파일 대신 본문 붙여 넣기'}</summary>
            <label class="sr" for="text">과제 본문</label>
            <textarea id="text" name="text" rows="8" placeholder="과제 본문과 참고문헌을 붙여 넣으세요.">${esc(d.text || '')}</textarea>
          </details>
          <div class="between sm"><span class="muted b" id="count">0자</span><button type="button" class="link" id="sample">${icon('science')} 처음이라면 예시 과제로 체험하기</button></div>
          <label class="lbl">과제 이름 <span class="xs muted">(파일 이름으로 자동 입력돼요)</span><input name="title" type="text" placeholder="예: 경영전략론 중간보고서" value="${esc(d.title || '')}"></label>
        </section>

        <section class="card stack" aria-labelledby="st2">
          ${stepHead(2, '<span id="st2">교수님 채점 스타일</span>', false, '고른 기준을 더 엄격하게 채점해요. 여러 개 골라도 돼요.')}
          <div class="tag-cards" role="group" aria-label="교수님 채점 스타일">
            ${TAGS.map(t => `<button type="button" class="tag tag-card" data-tag="${t.id}" aria-pressed="${tags.has(t.id)}">${icon(TAG_UI[t.id]?.[0] || 'check')}<span class="grow"><b>${esc(t.label)}</b><span class="xs muted">${TAG_UI[t.id]?.[1] || ''}</span></span>${icon('check_circle', 'fill tick')}</button>`).join('')}
          </div>
        </section>

        <section class="card stack" aria-labelledby="st3">
          ${stepHead(3, '<span id="st3">수업 지시사항</span>', false, '수업 때 들은 말을 적으면 지켰는지 하나씩 확인해요.')}
          <label class="sr" for="instructions">수업 때 하신 말씀</label>
          <textarea id="instructions" name="instructions" rows="3" placeholder="예: 참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것, 2,000자 이상">${esc(d.instructions || '')}</textarea>
          <button type="button" class="voice" id="mic" ${SR ? '' : 'disabled'}>
            <span class="mic">${icon('mic', 'fill')}</span>
            <span><b>말로 입력하기</b><br><span class="sm muted" id="mic-status">${SR ? '누르고 말하면 받아 적어요 · 다시 누르면 멈춰요' : '이 브라우저는 음성 입력을 지원하지 않아요 (Chrome 권장)'}</span></span>
          </button>
          <div class="two">
            <label class="lbl">요구 분량 (자)<input name="targetLength" type="number" min="0" step="100" inputmode="numeric" placeholder="모르면 비워 두기" value="${d.targetLength || ''}"></label>
            <label class="lbl">제출 마감일<input name="dueDate" type="date" value="${esc(d.dueDate || '')}"></label>
          </div>
        </section>
      </div>

      <aside class="check-side" aria-label="검사 준비 상태">
        <div class="card stack ready-card">
          <h2 class="card-title">${icon('task_alt')}검사 준비</h2>
          <ul class="ready-list">
            <li id="rd-text"></li>
            <li id="rd-tags"></li>
            <li id="rd-inst"></li>
          </ul>
          <div class="ready-get">
            <p class="xs muted b" style="margin:0 0 6px">검사하면 받는 것</p>
            <p class="sm b" style="margin:0">${icon('school')} 교수님 맞춤 예상 학점</p>
            <p class="sm b" style="margin:0">${icon('report')} 감점 포인트와 고치는 방법</p>
            <p class="sm b" style="margin:0">${icon('bolt')} 원클릭 교정</p>
          </div>
        </div>
        <div class="cta-bar">
          <p class="cta-status sm b" id="cta-status" aria-live="polite"></p>
          <button class="btn green big" id="submit" type="submit" ${running ? 'disabled' : ''}>${icon('search')}<span id="submit-label">${running ? '분석 중…' : '검사 시작'}</span></button>
        </div>
      </aside>
    </form>

    ${panel(session, s)}
    ${session.paywall ? `<div class="modal-wash" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <div class="modal">
        <div style="display:grid;place-items:center">${mascot(s.mascot, 'sad', 110)}</div>
        <h2 class="h2" id="pw-title">오늘 무료 검사를 다 썼어요</h2>
        <p class="muted b" style="margin:0">무료는 하루 과제 ${FREE_DAILY_FILES}개까지 검사할 수 있어요. 내일 다시 쓰거나, 프리미엄으로 무제한 검사하세요.</p>
        <a class="btn orange big" href="#/premium" id="pw-go">${icon('workspace_premium', 'fill')}프리미엄 알아보기</a>
        <button class="btn" id="pw-close">내일 할게요</button>
      </div>
    </div>` : ''}
    ${tabbar('check')}`;
  },

  mount(root, { store, session, rerender }) {
    const form = root.querySelector('#form');
    const text = form.querySelector('#text');
    const count = form.querySelector('#count');
    const submit = form.querySelector('#submit');
    const label = form.querySelector('#submit-label');
    const ctaStatus = form.querySelector('#cta-status');
    const pasteSum = form.querySelector('#paste-sum');
    const row = (id, ok, okText, noText, optional) => {
      const li = form.querySelector(id);
      li.className = ok ? 'ok' : optional ? 'opt' : 'todo';
      li.innerHTML = `${icon(ok ? 'check_circle' : optional ? 'radio_button_unchecked' : 'error', 'fill')}<span>${ok ? okText : noText}</span>`;
    };
    // 준비 상태와 버튼 문구를 입력에 맞춰 바로 바꿔요 (버튼이 왜 안 눌리는지 알 수 있게)
    const update = () => {
      const chars = text.value.replace(/\s+/g, ' ').trim().length;
      const tagN = form.querySelectorAll('.tag[aria-pressed="true"]').length;
      const inst = form.instructions.value.trim();
      count.textContent = `본문 ${chars.toLocaleString()}자`;
      row('#rd-text', chars >= 20, `과제 본문 ${chars.toLocaleString()}자`, chars ? '본문이 너무 짧아요 (20자 이상)' : '과제를 올려 주세요', false);
      row('#rd-tags', tagN > 0, `교수님 스타일 ${tagN}개`, '교수님 스타일 (선택)', true);
      row('#rd-inst', !!inst, '수업 지시사항 입력됨', '수업 지시사항 (선택)', true);
      if (session.phase === 'running') return;
      const ready = chars >= 20;
      submit.disabled = !ready;
      label.textContent = ready ? '검사 시작' : '과제를 먼저 올려 주세요';
      ctaStatus.textContent = ready
        ? [`본문 ${chars.toLocaleString()}자`, tagN ? `스타일 ${tagN}개` : '', inst ? '지시사항 있음' : ''].filter(Boolean).join(' · ')
        : '① 과제만 올리면 바로 검사할 수 있어요';
    };
    text.addEventListener('input', update);
    form.instructions.addEventListener('input', update);
    update();

    form.querySelectorAll('.tag').forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
      update();
    }));

    const slot = root.querySelector('#file-slot');
    const KIND = { hwp: '한글', hwpx: '한글', pdf: 'PDF', docx: '워드', pptx: 'PPT', txt: '텍스트', md: '텍스트' };
    let loaded = { fileName: store.get().draft?.fileName || '', fileKind: store.get().draft?.fileKind || '' };
    // 과제 이름: 자동으로 채운 이름은 새 파일을 올리면 따라 바뀌고, 직접 입력한 이름은 그대로 둠
    const t0 = form.title.value.trim();
    form.title.dataset.auto = !t0 || /\(예시\)$/.test(t0) || (loaded.fileName && t0 === loaded.fileName.replace(/\.[^.]+$/, '')) ? '1' : '0';
    form.title.addEventListener('input', () => { form.title.dataset.auto = form.title.value.trim() ? '0' : '1'; });
    const showFile = (name, chars, kind = '') => {
      loaded = { fileName: name, fileKind: kind };
      slot.innerHTML = fileCard(name, chars, kind);
    };

    // 파일 삭제 (되돌리기 가능)
    let backup = null;
    slot.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'delete-file') {
        backup = { text: text.value, title: form.title.value, ...loaded, chars: text.value.replace(/\s+/g, ' ').trim().length };
        text.value = '';
        if (form.title.dataset.auto === '1') form.title.value = '';
        loaded = { fileName: '', fileKind: '' };
        const d = store.get().draft;
        if (d) store.set({ draft: { ...d, text: '', fileName: '', fileKind: '', title: form.title.value } });
        Object.assign(session, { input: null, result: null, ai: null, aiError: null, baseScore: null, edits: [], phase: null });
        root.querySelector('#scan')?.remove();
        slot.innerHTML = `<div class="file removed">${icon('delete', 'fill')}<div class="grow"><b class="ellipsis">${esc(backup.fileName || backup.title || '과제')}</b><div class="sm b">파일과 본문을 지웠어요.</div></div><button type="button" class="btn sm" data-act="undo">${icon('undo')}되돌리기</button></div>`;
        const det = form.querySelector('details.paste');
        if (det) det.open = true;
        update();
      } else if (act === 'undo' && backup) {
        text.value = backup.text;
        form.title.value = backup.title;
        const d = store.get().draft;
        if (d) store.set({ draft: { ...d, text: backup.text, title: backup.title, fileName: backup.fileName, fileKind: backup.fileKind } });
        showFile(backup.fileName || backup.title || '불러온 과제', backup.chars, backup.fileKind);
        backup = null;
        update();
      }
    });
    const loadFile = async file => {
      if (!file) return;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        slot.innerHTML = `<div class="file err">${icon('error', 'fill')}<div class="grow"><b>파일이 너무 커요 (${MAX_FILE_MB}MB 이하)</b><div class="sm b">본문만 복사해서 아래에 붙여 넣어 주세요.</div></div></div>`;
        return;
      }
      const mb = file.size / 1048576;
      slot.innerHTML = `<div class="file busy">${icon('progress_activity', 'spin')}<div class="grow"><b class="ellipsis">${esc(file.name)}</b><div class="sm muted b" id="read-status">${mb >= 1 ? `${mb.toFixed(1)}MB · ` : ''}파일에서 글자를 읽는 중…</div></div></div>`;
      const status = slot.querySelector('#read-status');
      const onProgress = msg => { if (status) status.textContent = `${mb >= 1 ? `${mb.toFixed(1)}MB · ` : ''}${msg}`; };
      submit.disabled = true;
      try {
        const body = (await readAssignmentFile(file, onProgress)).trim();
        if (body.replace(/\s/g, '').length < 20) throw new Error('파일에서 읽을 수 있는 글자가 거의 없어요. 내용을 붙여 넣어 주세요.');
        text.value = body;
        if (!form.title.value.trim() || form.title.dataset.auto === '1') { form.title.value = file.name.replace(/\.[^.]+$/, ''); form.title.dataset.auto = '1'; }
        showFile(file.name, body.replace(/\s+/g, ' ').length, KIND[ext]);
        const det = form.querySelector('details.paste');
        if (det) det.open = false;
        pasteSum.textContent = '불러온 본문 확인·수정';
      } catch (e) {
        slot.innerHTML = `<div class="file err">${icon('error', 'fill')}<div class="grow"><b class="ellipsis">${esc(file.name)}</b><div class="sm b">${esc(e.message)}</div></div><label class="btn sm" for="file">다시 선택</label></div>`;
      } finally {
        form.querySelector('#file').value = '';
        update();
      }
    };
    const drop = form.querySelector('#drop');
    form.querySelector('#file').addEventListener('change', e => loadFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

    form.querySelector('#sample').addEventListener('click', () => {
      form.title.value = '거시경제학 기말 리포트 (예시)';
      form.title.dataset.auto = '1';
      form.instructions.value = SAMPLE.instructions;
      text.value = SAMPLE.text;
      form.querySelectorAll('.tag').forEach(b => b.setAttribute('aria-pressed', SAMPLE.tags.includes(b.dataset.tag)));
      showFile('예시 과제.txt', SAMPLE.text.replace(/\s+/g, ' ').trim().length, '텍스트');
      pasteSum.textContent = '불러온 본문 확인·수정';
      update();
    });

    // 음성 입력
    let rec = null;
    const mic = form.querySelector('#mic');
    const status = form.querySelector('#mic-status');
    if (SR) mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = 'ko-KR';
      rec.onresult = e => {
        const said = Array.from(e.results).map(r => r[0].transcript).join(' ');
        const ta = form.instructions;
        ta.value = (ta.value.trim() ? `${ta.value.trim()}, ` : '') + said;
      };
      rec.onerror = e => { status.textContent = `음성 인식 오류: ${e.error}`; };
      rec.onend = () => { rec = null; mic.classList.remove('rec'); status.textContent = '받아 적기 완료! 내용을 확인해 주세요.'; };
      rec.start();
      mic.classList.add('rec');
      status.textContent = '듣고 있어요… 다시 누르면 멈춰요.';
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (submit.disabled) return;
      if (!canAnalyze()) { session.paywall = true; session.afterUpgrade = 'check'; rerender(); return; }
      const input = {
        title: form.title.value.trim(),
        tags: [...form.querySelectorAll('.tag[aria-pressed="true"]')].map(b => b.dataset.tag),
        instructions: form.instructions.value.trim(),
        targetLength: Number(form.targetLength.value) || 0,
        dueDate: form.dueDate.value || '',
        text: text.value,
        fileName: text.value.trim() ? loaded.fileName : '',
        fileKind: text.value.trim() ? loaded.fileKind : '',
      };
      store.set({ draft: input });
      recordAnalysis();
      Object.assign(session, { input, result: null, ai: null, aiError: null, baseScore: null, ignored: new Set(), edits: [], selected: null, phase: 'running', startedAt: performance.now() });
      session.job = Promise.all([analyzeWithAI(input), new Promise(r => setTimeout(r, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : MIN_MS))])
        .then(([out]) => {
          Object.assign(session, { result: out.result, ai: out.ai, aiError: out.error, baseScore: out.result.score, phase: 'done' });
          store.addHistory({ title: input.title, score: out.result.score, grade: out.result.grade });
          store.addReward({ xp: REPORT_XP });
          if (location.hash.startsWith('#/check')) { rerender(); root.querySelector('#scan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          else toast(`분석 완료! 예상 ${out.result.grade}`);
        });
      rerender();
      root.querySelector('#scan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 진행 애니메이션 (분석 중일 때만)
    let raf = 0;
    if (session.phase === 'running') {
      const bar = root.querySelector('#bar');
      const pct = root.querySelector('#pct');
      const items = [...root.querySelectorAll('#steps li')];
      const tick = now => {
        const t = (now - session.startedAt) / MIN_MS;
        const p = Math.min(0.94, t < 1 ? t * 0.85 : 0.85 + (1 - Math.exp(-(t - 1) / 3)) * 0.09);
        const v = Math.round(p * 100);
        bar.style.width = `${v}%`; pct.textContent = `${v}%`;
        bar.parentElement.setAttribute('aria-valuenow', v);
        const active = Math.min(STEPS.length - 1, Math.floor(Math.min(t, 0.999) * (STEPS.length - 1)) + (t >= 1 ? 1 : 0));
        items.forEach((li, i) => {
          const cls = i < active ? 'done' : i === active ? 'run' : 'wait';
          if (li.className !== cls) {
            li.className = cls;
            li.querySelector('.ms').textContent = cls === 'done' ? 'check_circle' : cls === 'run' ? 'sync' : 'hourglass_top';
            li.querySelector('.st').textContent = cls === 'done' ? '완료' : cls === 'run' ? '진행 중' : '대기';
          }
        });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    root.querySelector('#pw-close')?.addEventListener('click', () => { session.paywall = false; rerender(); });
    root.querySelector('#pw-go')?.addEventListener('click', () => { session.paywall = false; });
    return () => { cancelAnimationFrame(raf); if (rec) rec.abort(); };
  },
};
