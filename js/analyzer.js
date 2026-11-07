// 에이플로 과제 분석 엔진 (규칙 기반)
// 강의계획서·교수님 지시사항·성향 태그를 채점 기준으로 바꾸고, 원문에서 감점 요소를 찾아낸다.
// 실제 AI 모델 연동 전까지 동작하는 기준 구현이며, 모든 결과는 "예상치"다.

export const TAGS = [
  { id: 'strict', label: '깐깐한 팩트폭행파' },
  { id: 'logic', label: '논리·창의성 중시' },
  { id: 'cite', label: '인용/출처 필수' },
  { id: 'structure', label: '서론-본론-결론파' },
  { id: 'length', label: '분량 엄수' },
];

export const RUBRIC = [
  { key: 'instruction', label: '지시사항 부합도', max: 30 },
  { key: 'citation', label: '출처·인용 포맷', max: 20 },
  { key: 'length', label: '분량 충족도', max: 20 },
  { key: 'style', label: '문장·논리', max: 30 },
];

// 한 영역에서 깎을 수 있는 최대 비율 (영역 하나로 0점이 되지 않게)
const MAX_DEDUCT_RATIO = 0.8;

const CITATION_RE = /\([^()]*?(\d{4}|n\.d\.)[a-z]?[^()]*?\)/;
const REF_HEADING_RE = /^[ \t]*(?:\d+\.\s*)?(참고\s*문헌|참고\s*자료|References|Bibliography)[ \t]*:?[ \t]*$/im;
const APA_REF_RE = /^[^()]+?\.\s\((\d{4}[a-z]?|n\.d\.)(,[^)]*)?\)\.\s.+\.\s*$/;
const LOCATION_RE = /(서울|파주|경기|부산|대전|Seoul|New York|London|Oxford|Cambridge)\s*:\s*/;

const COLLOQUIAL = [
  ['진짜', '실제로'], ['완전', '매우'], ['엄청', '상당히'], ['되게', '꽤'],
  ['너무', '매우'], ['근데', '그런데'], ['암튼', '어쨌든'], ['좀', '다소'],
];
const POLITE_ENDINGS = [
  ['있어요', '있다'], ['없어요', '없다'], ['했어요', '했다'], ['같아요', '같다'],
  ['봐요', '본다'], ['해요', '한다'], ['거든요', '기 때문이다'], ['이에요', '이다'], ['예요', '이다'],
];
const CLICHES = [
  '다양한 측면에서', '중요한 역할을 한다', '결론적으로 말하자면', '살펴보면 다음과 같다',
  '시사하는 바가 크다', '많은 사람들이 관심을 가지고 있다', '현대 사회에서',
];

export function deriveRequirements(tags = [], instructions = '', targetLength = 0) {
  const ins = instructions || '';
  const t = new Set(tags);
  let length = Number(targetLength) || 0;
  const m = ins.match(/(\d[\d,]*)\s*자/);
  if (!length && m) length = Number(m[1].replace(/,/g, ''));
  return {
    apa: /APA/i.test(ins) || t.has('cite'),
    needCitation: t.has('cite') || /출처|인용|참고\s*문헌|APA/i.test(ins),
    newsInIntro: /서론/.test(ins) && /(뉴스|기사|보도)/.test(ins),
    structure: t.has('structure') || /서론.*본론.*결론/.test(ins),
    strict: t.has('strict'),
    logic: t.has('logic'),
    strictLength: t.has('length'),
    length,
  };
}

// 원문을 본문과 참고문헌 영역으로 나눈다
export function splitReferences(text) {
  const m = REF_HEADING_RE.exec(text);
  if (!m) return { bodyEnd: text.length, refs: [] };
  const start = m.index + m[0].length;
  const refs = [];
  const re = /[^\n]+/g;
  re.lastIndex = start;
  let r;
  while ((r = re.exec(text))) {
    const line = r[0];
    const lead = line.length - line.trimStart().length;
    const trimmed = line.trim();
    if (trimmed) refs.push({ text: trimmed, start: r.index + lead, end: r.index + lead + trimmed.length });
  }
  return { bodyEnd: m.index, refs };
}

// 한국식·혼합 표기를 APA 7판 "저자. (연도). 제목. 출판사." 형태로 바꾼다
export function toApa(ref) {
  const m = ref.match(/^(.+?)\s*[.,]?\s*\(?\s*(\d{4}[a-z]?)\s*\)?\s*[.,]?\s*(.+)$/);
  if (!m) return null;
  const author = m[1].replace(/[.,\s]+$/, '').trim();
  const parts = m[3]
    .replace(/[『』「」《》〈〉"“”]/g, '')
    .split(/\s*[,.]\s+|\s*,\s*/)
    .map(s => s.replace(/[.\s]+$/, '').trim())
    .filter(Boolean);
  if (!author || parts.length === 0) return null;
  const title = parts[0];
  const publisher = parts.slice(1).join(', ').replace(LOCATION_RE, '').trim();
  return publisher ? `${author}. (${m[2]}). ${title}. ${publisher}.` : `${author}. (${m[2]}). ${title}.`;
}

function sentences(text, from, to) {
  const out = [];
  const re = /[^.!?\n]+[.!?]?/g;
  const slice = text.slice(from, to);
  let m;
  while ((m = re.exec(slice))) {
    const s = m[0];
    const lead = s.length - s.trimStart().length;
    const t = s.trim();
    if (t.length > 1) out.push({ text: t, start: from + m.index + lead, end: from + m.index + lead + t.length });
  }
  return out;
}

function findHeading(text, word) {
  const re = new RegExp(`(^|\\n)[ \\t]*(?:\\d+\\.|[IVⅠⅡⅢ]+\\.)?[ \\t]*${word}[^\\n]{0,20}(?=\\n)`);
  const m = re.exec(text);
  return m ? m.index + m[1].length : -1;
}

export function analyze({ text = '', tags = [], instructions = '', targetLength = 0 } = {}) {
  const req = deriveRequirements(tags, instructions, targetLength);
  const issues = [];
  let seq = 0;
  const add = (o) => issues.push({ id: `i${++seq}`, start: -1, end: -1, fix: null, ...o });

  const { bodyEnd, refs } = splitReferences(text);
  const body = text.slice(0, bodyEnd);
  const bodyChars = body.replace(/\s+/g, ' ').trim().length;

  // 1) 참고문헌
  if (req.needCitation && refs.length === 0) {
    add({ severity: 'danger', category: 'citation', title: '참고문헌 목록 없음',
      reason: '교수님이 출처 표기를 요구했는데 참고문헌 목록이 없어요.',
      suggestion: '글 끝에 "참고문헌" 제목을 달고 사용한 자료를 APA 형식으로 정리하세요.', gain: 6 });
  }
  for (const ref of refs) {
    if (!req.apa) break;
    if (!APA_REF_RE.test(ref.text)) {
      const fixed = toApa(ref.text);
      add({ severity: 'danger', category: 'citation', title: 'APA 양식 아님', start: ref.start, end: ref.end,
        reason: '교수님이 말한 APA 7판 형식(저자. (연도). 제목. 출판사.)과 달라요.',
        suggestion: fixed ? `${fixed}  (제목은 이탤릭체로)` : '저자. (연도). 제목. 출판사. 순서로 고치세요.',
        fix: fixed, gain: 2 });
    } else if (LOCATION_RE.test(ref.text)) {
      const fixed = ref.text.replace(LOCATION_RE, '');
      add({ severity: 'danger', category: 'citation', title: '출판사 위치 표기', start: ref.start, end: ref.end,
        reason: 'APA 7판부터는 출판사 위치(예: 서울:)를 쓰지 않아요.', suggestion: fixed, fix: fixed, gain: 2 });
    }
  }

  // 2) 출처 없는 직접 인용
  const quoteRe = /["“]([^"”\n]{8,})["”]/g;
  let q, unsourcedQuoteChars = 0;
  while ((q = quoteRe.exec(body))) {
    const after = body.slice(q.index + q[0].length, q.index + q[0].length + 30);
    if (!CITATION_RE.test(after)) {
      unsourcedQuoteChars += q[1].length;
      add({ severity: 'danger', category: 'citation', title: '출처 없는 직접 인용',
        start: q.index, end: q.index + q[0].length,
        reason: '따옴표로 가져온 문장 뒤에 출처가 없어 표절로 볼 수 있어요.',
        suggestion: '인용 바로 뒤에 (저자, 연도)를 붙이거나, 내 말로 바꿔 쓰세요(패러프레이징).',
        fix: `${q[0]}(저자, 연도)`, gain: 3 });
    }
  }

  const bodySentences = sentences(text, 0, bodyEnd);

  // 3) 근거 없는 수치
  if (req.needCitation || req.strict) {
    for (const s of bodySentences) {
      if (/\d+(\.\d+)?\s*(%|퍼센트|배|명|억|만\s*원|조)/.test(s.text) && !CITATION_RE.test(s.text)) {
        add({ severity: req.strict ? 'danger' : 'warning', category: 'citation', title: '근거 없는 수치',
          start: s.start, end: s.end,
          reason: req.strict ? '팩트에 깐깐한 교수님이에요. 통계·수치에는 반드시 출처가 필요해요.' : '수치를 인용했는데 출처가 없어요.',
          suggestion: '문장 끝에 (기관명, 연도) 형식으로 출처를 밝히세요.',
          fix: s.text.replace(/([.!?]?)$/, ' (출처, 연도)$1'), gain: req.strict ? 3 : 2 });
      }
    }
  }

  // 4) 구어체·존댓말 어미
  for (const [word, rep] of COLLOQUIAL) {
    const re = new RegExp(`(^|[\\s(])(${word})(?=[\\s,.])`, 'g');
    let m;
    while ((m = re.exec(body))) {
      const st = m.index + m[1].length;
      add({ severity: 'warning', category: 'style', title: '구어체 표현', start: st, end: st + word.length,
        reason: `"${word}"는 말할 때 쓰는 표현이라 보고서 톤에 맞지 않아요.`, suggestion: rep, fix: rep, gain: 1 });
    }
  }
  for (const [end, rep] of POLITE_ENDINGS) {
    const re = new RegExp(`${end}(?=[.!?\\s]|$)`, 'g');
    let m;
    while ((m = re.exec(body))) {
      add({ severity: 'warning', category: 'style', title: '보고서 어미 아님', start: m.index, end: m.index + end.length,
        reason: '보고서는 "-다" 체로 쓰는 것이 기본이에요.', suggestion: rep, fix: rep, gain: 1 });
    }
  }

  // 5) 상투 표현 (AI 생성 문체 의심)
  let clicheCount = 0;
  for (const c of CLICHES) {
    let idx = body.indexOf(c);
    while (idx !== -1) {
      clicheCount++;
      add({ severity: 'warning', category: 'style', title: 'AI 문체 의심 표현', start: idx, end: idx + c.length,
        reason: '어디서나 쓰이는 상투 표현이라 AI가 쓴 글처럼 보일 수 있어요.',
        suggestion: '구체적인 근거나 내 생각을 담은 표현으로 바꿔 보세요.', gain: 1 });
      idx = body.indexOf(c, idx + c.length);
    }
  }

  // 6) 너무 긴 문장
  for (const s of bodySentences) {
    if (s.text.length > 140) {
      add({ severity: 'warning', category: 'style', title: '너무 긴 문장', start: s.start, end: s.end,
        reason: `한 문장이 ${s.text.length}자예요. 논리가 흐려 보일 수 있어요.`,
        suggestion: '두세 문장으로 나누고 접속어로 연결하세요.', gain: req.logic ? 2 : 1 });
    }
  }

  // 7) 서론-본론-결론 구조
  if (req.structure) {
    for (const w of ['서론', '본론', '결론']) {
      if (findHeading(body, w) === -1) {
        add({ severity: 'danger', category: 'instruction', title: `'${w}' 구성 없음`,
          reason: `서론-본론-결론 구조를 중시하는 교수님인데 '${w}' 부분이 보이지 않아요.`,
          suggestion: `'${w}' 소제목을 달고 해당 내용을 정리하세요.`, gain: 4 });
      }
    }
  }

  // 8) 서론 뉴스 기사 인용 (구두 지시사항)
  if (req.newsInIntro) {
    const iStart = findHeading(body, '서론');
    let intro;
    if (iStart !== -1) {
      const next = ['본론', '결론'].map(w => findHeading(body.slice(iStart + 2), w)).filter(i => i !== -1);
      intro = body.slice(iStart, next.length ? iStart + 2 + Math.min(...next) : body.length);
    } else {
      intro = body.split(/\n\s*\n/)[0] || '';
    }
    if (!/(뉴스|기사|보도|일보|신문|news)/i.test(intro)) {
      add({ severity: 'danger', category: 'instruction', title: '서론에 뉴스 인용 없음',
        reason: '수업 때 교수님이 "서론에 뉴스 기사를 인용하라"고 했는데 서론에서 찾을 수 없어요.',
        suggestion: '서론 첫 문단에 관련 기사 한 줄을 인용하고 (언론사, 연도)를 붙이세요.', gain: 4 });
    }
  }

  // 9) 분량
  if (req.length > 0) {
    const ratio = bodyChars / req.length;
    if (ratio < 0.95) {
      const danger = ratio < 0.8 || req.strictLength;
      add({ severity: danger ? 'danger' : 'warning', category: 'length', title: '분량 미달',
        reason: `본문이 ${bodyChars.toLocaleString()}자로, 요구 분량 ${req.length.toLocaleString()}자의 ${Math.round(ratio * 100)}%예요.`,
        suggestion: `${(req.length - bodyChars).toLocaleString()}자 정도 더 쓰세요. 본론의 근거를 보강하면 좋아요.`,
        gain: Math.min(16, Math.round((1 - ratio) * 40)) || 1 });
    } else if (ratio > (req.strictLength ? 1.1 : 1.3)) {
      add({ severity: 'warning', category: 'length', title: '분량 초과',
        reason: `요구 분량보다 ${Math.round((ratio - 1) * 100)}% 길어요.`,
        suggestion: '중복되는 문단을 줄여 핵심만 남기세요.', gain: req.strictLength ? 4 : 2 });
    }
  }

  return finalize({ text, issues, req, bodyChars, unsourcedQuoteChars, clicheCount, instructions });
}

export function scoreOf(issues) {
  const rubric = RUBRIC.map(r => {
    const lost = issues.filter(i => i.category === r.key).reduce((s, i) => s + i.gain, 0);
    const deduct = Math.min(lost, Math.round(r.max * MAX_DEDUCT_RATIO));
    return { ...r, score: r.max - deduct };
  });
  return { rubric, score: rubric.reduce((s, r) => s + r.score, 0) };
}

export function gradeOf(score) {
  const table = [[95, 'A+'], [90, 'A0'], [85, 'B+'], [80, 'B0'], [75, 'C+'], [70, 'C0'], [65, 'D+'], [60, 'D0']];
  for (const [min, g] of table) if (score >= min) return g;
  return 'F';
}

function finalize({ text, issues, req, bodyChars, unsourcedQuoteChars, clicheCount, instructions }) {
  issues.sort((a, b) => (a.severity === b.severity ? b.gain - a.gain : a.severity === 'danger' ? -1 : 1));
  const { rubric, score } = scoreOf(issues);

  // 수정 우선순위: 점수를 가장 많이 올리는 항목부터
  const byGain = [...issues].sort((a, b) => b.gain - a.gain);
  const top = byGain.slice(0, 3);
  const potentialScore = scoreOf(issues.filter(i => !top.includes(i))).score;

  // 표절·AI 의심률 추정: 출처 없는 인용 분량 + 상투 표현 빈도
  const rate = bodyChars === 0 ? 0 : Math.min(95, Math.round(
    2 + (unsourcedQuoteChars / bodyChars) * 100 + clicheCount * 3,
  ));
  const plagiarism = { rate, level: rate <= 10 ? 'safe' : rate <= 20 ? 'warning' : 'danger' };

  const danger = issues.find(i => i.severity === 'danger');
  let mood, message;
  if (danger) {
    mood = 'danger';
    message = `잠깐! ${danger.reason} ${danger.fix != null ? '바로 고쳐줄까?' : '같이 보완해 보자!'}`;
  } else if (issues.length === 0 || score >= 95) {
    mood = 'safe';
    message = '대박! 교수님 요구사항을 다 지켰어. 이대로 제출하자!';
  } else {
    mood = 'warning';
    message = `거의 다 왔어! 주의 항목 ${issues.length}개만 다듬으면 더 올라가.`;
  }

  // 지시사항 체크리스트: 자동 확인한 것과 직접 확인할 것
  const checklist = (instructions || '')
    .split(/[\n,·]|(?:\.\s)/).map(s => s.trim()).filter(s => s.length > 1)
    .map(s => ({ text: s, auto: /APA|참고\s*문헌|출처|인용|뉴스|기사|서론|본론|결론|\d+\s*자/i.test(s) }));

  return {
    score, grade: gradeOf(score), rubric, plagiarism, issues, mood, message, req, checklist,
    fixes: top,
    potential: { score: potentialScore, grade: gradeOf(potentialScore), gain: potentialScore - score },
    stats: { chars: bodyChars, total: text.length },
  };
}

export function applyFix(text, issue) {
  if (issue.fix == null || issue.start < 0) return text;
  return text.slice(0, issue.start) + issue.fix + text.slice(issue.end);
}
