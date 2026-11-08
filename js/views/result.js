// STEP 4. 점수 진단: 예측 점수·학점, 승급 가능성, 핵심 지표, AI·표절 의심률, 루브릭, 지시사항 체크
import { topbar, tabbar, icon, esc, mascotTalk, player, SEVERITY, LEVEL_WORD } from '../ui.js';

const RUB_ICON = { instruction: 'verified', citation: 'format_quote', length: 'straighten', style: 'psychology' };
const MOOD = { danger: 'danger', warning: 'quiz', safe: 'cheer' };
const SAFETY = { safe: '안전', warning: '주의 필요', danger: '위험' };

export default {
  render({ session }) {
    const r = session.ensureResult();
    if (!r) {
      return `${topbar()}<section class="card empty-state">${mascotTalk({ mood: 'quiz', small: true, html: '"아직 검사한 과제가 없어! 과제를 올려 주면 바로 진단할게."' })}<a class="btn green big" href="#/check">${icon('upload_file')}과제 제출하러 가기</a></section>${tabbar('result')}`;
    }
    const { streak } = player();
    const title = session.input.title || '제목 없는 과제';
    const checks = r.checklist.filter(c => c.met !== undefined);
    const met = checks.filter(c => c.met).length;
    const level = x => (x.score / x.max >= 0.9 ? 'safe' : x.score / x.max >= 0.7 ? 'warning' : 'danger');
    const up = r.potential.grade !== r.grade;
    const base = session.baseScore ?? r.score;
    const moved = r.score - base;
    const groups = r.rubric.map(x => ({ ...x, list: r.issues.filter(i => i.category === x.key) })).filter(g => g.list.length);
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    return `${topbar()}
    <div class="print-only print-head"><b>에이플로 과제 검사 리포트</b><span>${esc(title)} · ${today} · ${r.source === 'ai' ? 'AI 채점 반영' : '기본 채점'}</span></div>
    ${mascotTalk({ mood: MOOD[r.mood], html: `"${esc(r.message)}"`, tint: true })}

    <section class="card tint stack score-card" style="gap:18px">
      <div class="between wrap">
        ${streak ? `<span class="chip orange">${icon('local_fire_department', 'fill')}${streak}일 연속 방어 중!</span>` : '<span></span>'}
        <span class="chip ${r.source === 'ai' ? 'green' : ''}" title="${esc(session.aiError || '')}">${icon(r.source === 'ai' ? 'auto_awesome' : 'rule')}${r.source === 'ai' ? 'AI 채점 반영' : '기본 채점'}</span>
      </div>
      <p class="sm b t-blue" style="margin:0">${esc(title)}</p>
      <div class="between wrap" style="align-items:flex-end">
        <div><div class="b muted">AI 종합 예측 점수</div><h1 class="score-big">${r.score}<small> / 100점</small></h1>
          ${moved ? `<div class="sm b ${moved > 0 ? 't-green' : 't-red'}">${icon(moved > 0 ? 'trending_up' : 'trending_down')}처음 ${base}점 → 지금 ${r.score}점 (${moved > 0 ? '+' : ''}${moved})</div>` : ''}</div>
        <div class="stack" style="gap:6px;align-items:center">
          <div class="target"><div class="sm b">${up ? '목표 학점' : '예상 학점'}</div><div class="g" aria-label="${up ? `${r.grade}에서 ${r.potential.grade}로` : r.grade}">${r.grade}${up ? `${icon('arrow_forward')}<span class="to">${r.potential.grade}</span>` : ''}</div></div>
          ${up ? `<span class="b t-green sm">+${r.potential.gain}점이면 승급 ✨</span>` : ''}
        </div>
      </div>
      <div class="grid-3">
        <div class="tile">${icon('fact_check', 'fill t-green')}지시사항 충족<b class="${checks.length && met < checks.length ? 't-red' : 't-green'}">${checks.length ? `${met}/${checks.length}` : '—'}</b></div>
        <div class="tile">${icon('bolt', 'fill t-orange')}수정 포인트<b class="${r.issues.length ? 't-red' : 't-green'}">${r.issues.length}건 발견</b></div>
        <div class="tile">${icon('shield', 'fill t-blue')}표절 안전성<b class="${r.plagiarism.level === 'safe' ? 't-green' : r.plagiarism.level === 'warning' ? 't-orange' : 't-red'}">${SAFETY[r.plagiarism.level]}</b></div>
      </div>
    </section>

    <section class="card stack plag-card">
      <div class="between"><h2 class="card-title">${icon('policy', 'fill')}AI·표절 의심률</h2><span class="sev ${r.plagiarism.level}"><span class="dot ${r.plagiarism.level}"></span>${LEVEL_WORD[r.plagiarism.level]} 단계</span></div>
      <div class="between wrap"><b style="font-size:34px;font-weight:900">${r.plagiarism.rate}%</b><span class="sm muted b">검사 완료 (${r.stats.chars.toLocaleString()}자 기준)</span></div>
      <div class="ratebar" role="img" aria-label="의심률 ${r.plagiarism.rate}%">
        <span class="z safe"></span><span class="z warning"></span><span class="z danger"></span>
        <span class="needle" style="left:${Math.min(98, Math.max(2, r.plagiarism.rate * 2.5))}%"></span>
      </div>
      <div class="ratelegend"><span class="t-green">● 안전 (0~10%)</span><span style="color:#B03A6B">● 주의 (11~20%)</span><span class="t-red">● 위험 (21%+)</span></div>
      <p class="xs muted b" style="margin:0">출처 없는 인용·AI 문체 표현으로 계산한 예상치예요. 실제 표절 검사기 결과와 다를 수 있어요.</p>
    </section>

    <div class="between"><h2 class="h2">루브릭 정밀 평가</h2><span class="sm muted b">총 ${r.rubric.length}개 항목 검토됨</span></div>
    ${r.rubric.map(x => `<section class="card rub">
      <div class="rub-head">
        <span class="rub-icon">${icon(RUB_ICON[x.key] || 'checklist')}</span>
        <div class="grow"><h3 class="h3">${esc(x.label)}</h3>${x.comment ? `<p class="sm muted b" style="margin:2px 0 0">${esc(x.comment)}</p>` : ''}</div>
        <div class="rub-score"><b>${x.score}</b> <span class="muted b">/ ${x.max}점</span><br><span class="sev ${level(x)}"><span class="dot ${level(x)}"></span>${SEVERITY[level(x)]}</span></div>
      </div>
      <div class="meter"><span class="m-${level(x)}" style="width:${Math.round((x.score / x.max) * 100)}%"></span></div>
    </section>`).join('')}

    ${r.checklist.length ? `<section class="card stack">
      <h2 class="card-title">${icon('campaign')}교수님 지시사항 체크</h2>
      <ul class="checklist">${r.checklist.map(c => {
        const st = c.met === true ? ['met', 'check_circle', '지킴'] : c.met === false ? ['unmet', 'cancel', '안 지킴'] : c.auto ? ['auto', 'radio_button_unchecked', '자동 확인'] : ['manual', 'radio_button_unchecked', '직접 확인'];
        return `<li class="${st[0]}">${icon(st[1], 'fill')}<div><b>${esc(c.text)}</b> <span class="xs muted b">${st[2]}</span>${c.evidence ? `<div class="sm muted">${esc(c.evidence)}</div>` : ''}</div></li>`;
      }).join('')}</ul>
    </section>` : ''}

    ${r.fixes.length && r.potential.gain > 0 ? `<section class="card stack">
      <h2 class="card-title">${icon('rocket_launch')}이것만 고치면 <span class="t-green">${r.potential.grade}</span> 가능!</h2>
      <ol class="fixes">${r.fixes.map(f => `<li><span class="sev ${f.severity}">${SEVERITY[f.severity]}</span><span class="grow">${esc(f.title)}</span><b class="plus">+${f.gain}</b></li>`).join('')}</ol>
    </section>` : ''}

    ${groups.length ? `<section class="card stack all-issues">
      <div class="between"><h2 class="card-title">${icon('checklist')}수정 포인트 전체</h2><span class="sm muted b">위험 ${r.issues.filter(i => i.severity === 'danger').length} · 주의 ${r.issues.filter(i => i.severity !== 'danger').length}</span></div>
      ${groups.map(g => `<details class="iss-group" ${g.list.some(i => i.severity === 'danger') ? 'open' : ''}>
        <summary><b>${esc(g.label)}</b><span class="chip xs">${g.list.length}건</span></summary>
        <ul class="iss-list">${g.list.map(i => `<li><span class="dot ${i.severity}"></span><div class="grow"><b>${esc(i.title)}</b>${i.start >= 0 ? ` <span class="snip">${esc(session.input.text.slice(i.start, Math.min(i.end, i.start + 40)))}${i.end - i.start > 40 ? '…' : ''}</span>` : ''}
          <div class="sm muted">${esc(i.reason)}</div>${i.fix != null ? `<div class="sm t-green b">→ ${esc(i.fix.slice(0, 80))}</div>` : ''}</div><b class="plus">+${i.gain}</b></li>`).join('')}</ul>
      </details>`).join('')}
    </section>` : ''}

    <a class="btn green big" href="#/editor">${icon('spellcheck')}교정 에디터에서 바로 고치기</a>
    <button class="btn big no-print" id="print">${icon('picture_as_pdf')}검사 리포트 PDF로 저장</button>
    <p class="xs muted b no-print" style="margin:-6px 0 0;text-align:center">인쇄 창에서 '대상'을 'PDF로 저장'으로 고르세요.</p>
    ${tabbar('result')}`;
  },

  mount(root) {
    root.querySelector('#print')?.addEventListener('click', () => {
      // 인쇄할 때는 접힌 목록도 모두 펼침
      const closed = [...root.querySelectorAll('details:not([open])')];
      closed.forEach(d => { d.open = true; });
      const restore = () => { closed.forEach(d => { d.open = false; }); window.removeEventListener('afterprint', restore); };
      window.addEventListener('afterprint', restore);
      window.print();
    });
  },
};
