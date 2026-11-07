// STEP 4. 종합 분석 결과 대시보드
import { topbar, tabbar, bubble, esc, SEVERITY } from '../ui.js';
import { mascot } from '../mascot.js';

const MOOD_MASCOT = { danger: 'danger', warning: 'quiz', safe: 'cheer' };
const RATE_LABEL = { safe: '안전', warning: '주의', danger: '위험' };

export default {
  render({ store, session }) {
    const r = session.ensureResult();
    if (!r) return `${topbar('분석 결과')}<section class="card stack"><p>아직 검사한 과제가 없어요.</p><a class="btn primary" href="#/check">과제 검사하러 가기</a></section>${tabbar('check')}`;
    const title = session.input.title || '제목 없는 과제';
    const dangers = r.issues.filter(i => i.severity === 'danger').length;
    const warnings = r.issues.length - dangers;
    const rubricLevel = x => (x.score / x.max >= 0.9 ? 'safe' : x.score / x.max >= 0.7 ? 'warning' : 'danger');

    return `${topbar('분석 결과')}
    <div class="row-between"><h1 class="h2 doc-title">${esc(title)}</h1>
      <span class="source ${r.source === 'ai' ? 'on' : ''}" title="${esc(session.aiError || '')}">${r.source === 'ai' ? 'AI 채점 반영' : '기본 채점'}</span></div>
    <section class="banner">
      <div class="banner-scores">
        <div><span class="small">예상 점수</span><b class="score">${r.score}<small>/100</small></b></div>
        <div class="grade-badge" aria-label="유력 학점 ${r.grade}">${r.grade}</div>
      </div>
      <div class="banner-talk">${mascot(store.get().mascot, MOOD_MASCOT[r.mood], 64)}${bubble(esc(r.message))}</div>
      <p class="small banner-meta">위험 ${dangers}개 · 주의 ${warnings}개 · 본문 ${r.stats.chars.toLocaleString()}자</p>
    </section>

    ${r.fixes.length && r.potential.gain > 0 ? `<section class="card stack">
      <h2 class="h3">이것만 고치면 <span class="up">${r.potential.grade}</span> 가능! <span class="muted small">+${r.potential.gain}점</span></h2>
      <ol class="fixes">${r.fixes.map(f => `<li><span class="sev ${f.severity}">${SEVERITY[f.severity]}</span><span class="grow">${esc(f.title)}</span><b class="plus">+${f.gain}</b></li>`).join('')}</ol>
    </section>` : ''}

    <section class="card stack">
      <div class="row-between"><h2 class="h3">AI·표절 의심률</h2><span class="sev ${r.plagiarism.level}">${RATE_LABEL[r.plagiarism.level]} ${r.plagiarism.rate}%</span></div>
      <div class="ratebar" role="img" aria-label="의심률 ${r.plagiarism.rate}%, 안전 0~10, 주의 11~20, 위험 21% 이상">
        <span class="z safe"></span><span class="z warning"></span><span class="z danger"></span>
        <span class="needle" style="left:${Math.min(100, r.plagiarism.rate * (100 / 40))}%"></span>
      </div>
      <div class="ratelegend small"><span>안전 ~10%</span><span>주의 11–20%</span><span>위험 21%+</span></div>
      <p class="small muted">출처 없는 인용과 상투 표현으로 계산한 예상치예요. 실제 표절 검사기 결과와 다를 수 있어요.</p>
    </section>

    <section class="card stack">
      <h2 class="h3">루브릭 항목별 평가</h2>
      ${r.rubric.map(x => `<div class="rub">
        <div class="row-between small"><span>${esc(x.label)}</span><b class="t-${rubricLevel(x)}">${x.score}/${x.max}</b></div>
        <div class="meter"><span class="m-${rubricLevel(x)}" style="width:${Math.round((x.score / x.max) * 100)}%"></span></div>
        ${x.comment ? `<p class="small muted rub-comment">${esc(x.comment)}</p>` : ''}
      </div>`).join('')}
    </section>

    ${r.checklist.length ? `<section class="card stack">
      <h2 class="h3">교수님 지시사항 체크</h2>
      <ul class="checklist">${r.checklist.map(c => {
        const tag = c.met === true ? ['met', '지킴'] : c.met === false ? ['unmet', '안 지킴'] : c.auto ? ['auto', '자동 확인'] : ['', '직접 확인'];
        return `<li class="${tag[0]}"><span class="small tag">${tag[1]}</span><span>${esc(c.text)}${c.evidence ? `<span class="small muted evidence">${esc(c.evidence)}</span>` : ''}</span></li>`;
      }).join('')}</ul>
    </section>` : ''}

    <a class="btn primary big" href="#/editor">교정 에디터에서 바로 고치기</a>
    ${tabbar('check')}`;
  },
};
