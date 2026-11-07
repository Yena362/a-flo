// STEP 1 & 3. 과제 & 교수 맞춤 정보 입력 + 실시간 분석 진행 (한 화면)
import { topbar, tabbar, icon, esc, mascotTalk, toast } from '../ui.js';
import { mascot, CHARACTERS } from '../mascot.js';
import { TAGS } from '../analyzer.js';
import { analyzeWithAI } from '../ai.js';
import { readAssignmentFile } from '../docx.js';
import { SAMPLE } from '../sample.js';
import { isPremium, remaining, canAnalyze, recordAnalysis, FREE_DAILY_FILES } from '../plan.js';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const EMOJI = { strict: '🔍', logic: '💡', cite: '📚', structure: '📝', length: '⏱️' };
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
    return `${topbar()}
    <div class="row wrap"><span class="chip ink">STEP 1 &amp; 3</span><span class="chip green">과제 &amp; 교수 맞춤 분석</span>
      ${isPremium() ? `<span class="chip ink">${icon('workspace_premium', 'fill')}프리미엄 · 무제한</span>` : `<a class="chip ${remaining() ? 'blue' : 'red'}" href="#/premium">${icon('confirmation_number')}오늘 무료 검사 ${remaining()}/${FREE_DAILY_FILES}회 남음</a>`}</div>
    ${mascotTalk({ mood: 'quiz', small: true, html: '"어떤 교수님 수업이야? 스타일을 알려주면 감점 요소를 꼼꼼하게 걸러낼게!"<p class="sm muted" style="margin:6px 0 0">과제 파일과 교수님 취향을 입력하면 AI가 분석해요.</p>' })}

    <form class="stack" id="form" novalidate style="gap:18px">
      <section class="card stack">
        <div class="between"><h2 class="card-title">${icon('psychology')}교수님 평가 성향 선택</h2><span class="chip blue xs">다중 선택 가능</span></div>
        <div class="tags" role="group" aria-label="교수님 성향">
          ${TAGS.map(t => `<button type="button" class="tag" data-tag="${t.id}" aria-pressed="${tags.has(t.id)}">${EMOJI[t.id] || ''} ${esc(t.label)}</button>`).join('')}
        </div>
      </section>

      <section class="card stack">
        <div class="between"><h2 class="card-title">${icon('record_voice_over')}강의실 구두 지시 &amp; 꿀팁</h2><span class="chip green xs">AI 특별 감지</span></div>
        <label class="sr" for="instructions">수업 때 하신 말씀</label>
        <textarea id="instructions" name="instructions" rows="3" placeholder="예: 참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것, 2,000자 이상">${esc(d.instructions || '')}</textarea>
        <button type="button" class="voice" id="mic" ${SR ? '' : 'disabled'}>
          <span class="mic">${icon('mic', 'fill')}</span>
          <span><b>🎙️ 음성 메모로 말하기</b><br><span class="sm muted" id="mic-status">${SR ? '탭하여 녹음 · 다시 누르면 멈춰요' : '이 브라우저는 음성 입력을 지원하지 않아요 (Chrome 권장)'}</span></span>
        </button>
        <div class="two">
          <label class="lbl">요구 분량 (자)<input name="targetLength" type="number" min="0" step="100" inputmode="numeric" placeholder="자동" value="${d.targetLength || ''}"></label>
          <label class="lbl">제출 마감일<input name="dueDate" type="date" value="${esc(d.dueDate || '')}"></label>
        </div>
      </section>

      <section class="card stack">
        <div class="between"><h2 class="card-title">${icon('folder_zip')}과제 원문 파일 업로드</h2><span class="chip xs">HWP · PDF · DOCX</span></div>
        <label class="lbl">과제 이름<input name="title" type="text" placeholder="예: 경영전략론 중간보고서" value="${esc(d.title || '')}"></label>
        <div id="file-slot">${d.text ? fileCard(d.fileName || d.title || '불러온 과제', d.text.replace(/\s+/g, ' ').trim().length, d.fileKind) : ''}</div>
        <label class="drop" id="drop">
          <input type="file" id="file" accept=".hwp,.hwpx,.pdf,.docx,.pptx,.txt,.md,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp,application/vnd.hancom.hwpx,application/hwp+zip,application/octet-stream,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" class="sr">
          ${icon('cloud_upload')}
          <span><b>눌러서 파일 선택</b> <span class="sm muted">(PC는 끌어다 놓기)</span><br><span class="sm muted">한글(HWP·HWPX) · PDF · 워드(DOCX) · TXT</span></span>
        </label>
        <details class="paste" ${d.text ? '' : 'open'}>
          <summary>본문 직접 붙여 넣기 / 확인</summary>
          <textarea id="text" name="text" rows="8" placeholder="과제 본문과 참고문헌을 붙여 넣으세요.">${esc(d.text || '')}</textarea>
        </details>
        <div class="between sm"><button type="button" class="link" id="sample">예시 과제 불러오기</button><span class="muted b" id="count">0자</span></div>
      </section>

      <div class="sticky-cta"><button class="btn green big" id="submit" type="submit" ${running ? 'disabled' : ''}>${icon('search')}${running ? '분석 중…' : '분석 시작'}</button></div>
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
    const update = () => {
      count.textContent = `${text.value.replace(/\s+/g, ' ').trim().length.toLocaleString()}자`;
      if (session.phase !== 'running') submit.disabled = text.value.trim().length < 20;
    };
    text.addEventListener('input', update);
    update();

    form.querySelectorAll('.tag').forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
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
        Object.assign(session, { input: null, result: null, ai: null, aiError: null, baseScore: null, phase: null });
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
      Object.assign(session, { input, result: null, ai: null, aiError: null, baseScore: null, ignored: new Set(), phase: 'running', startedAt: performance.now() });
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
