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

const CITATION_RE = /\([^()]*?(\d{4}(?!\s*년)|n\.d\.)[a-z]?[^()]*?\)/;
// 참고문헌 제목 줄: "참고문헌", "Ⅳ. 참고문헌", "[참고문헌]", "■ 참고 문헌", "5) References" 등
const HEAD_PREFIX = String.raw`[ \t]*(?:[■□●○◆◇▶※▣◎]\s*)?(?:(?:제\s*)?(?:\d{1,2}|[IVX]{1,4}|[Ⅰ-Ⅻ])\s*(?:장|절)?\s*[.)]?\s*)?[\[<【〈(]?\s*`;
const HEAD_SUFFIX = String.raw`\s*[\]>】〉)]?`;
const REF_WORDS = String.raw`(?:참고\s*문헌|참고\s*자료|인용\s*문헌|References?|Bibliography|Works\s+Cited)`;
const REF_HEADING_RE = new RegExp(`^${HEAD_PREFIX}${REF_WORDS}${HEAD_SUFFIX}[ \\t]*:?[ \\t]*$`, 'gim');
// APA 7판: "저자 (연도). 제목. 출판사." / 한국어 저자는 "김철수 (2021)." 또는 "김철수(2021).", 기관은 "통계청. (2023)."
// 끝은 마침표 또는 DOI·URL
const APA_REF_RE = /^[^()]+?\s?\((\d{4}[a-z]?|n\.d\.)(,[^)]*)?\)\.\s.+?(\.|\s(https?:\/\/|doi:)\S+)\s*$/i;
const LOCATION_RE = /(서울|파주|경기|부산|대전|대구|광주|인천|고양|성남|Seoul|New York|London|Oxford|Cambridge)\s*:\s*/;
const PUBLISHER_RE = /(출판|출판사|북스|문고|아카데미|프레스|Press|Books|한울|박영|학지사|창비|민음사|문학동네|길벗|한빛|김영사|[가-힣]사$)/i;
const PLACEHOLDER_RE = /\((?:저자|출처|기관명?|언론사|저자명)[^()]{0,6},\s*연도\)/g;

// 섹션 제목 동의어 (보고서마다 부르는 이름이 달라서)
const SECTION_WORDS = {
  서론: String.raw`(?:서\s*론|들어가며|들어가는\s*말|머리말|문제\s*제기|Introduction)`,
  본론: String.raw`(?:본\s*론|Body)`,
  결론: String.raw`(?:결\s*론|나가며|나가는\s*말|맺음말|맺으며|마치며|결\s*어|Conclusion)`,
};

const COLLOQUIAL = [
  ['진짜', '실제로'], ['완전', '매우'], ['엄청', '상당히'], ['되게', '꽤'],
  ['너무', '매우'], ['근데', '그런데'], ['암튼', '어쨌든'], ['좀', '다소'],
];
// 뒤에 조사가 붙어도 잡는 구어 표현
const COLLOQUIAL_STEM = [['얘기', '이야기'], ['알바', '아르바이트'], ['요즘', '최근']];
const POLITE_ENDINGS = [
  ['있어요', '있다'], ['없어요', '없다'], ['했어요', '했다'], ['같아요', '같다'],
  ['봐요', '본다'], ['해요', '한다'], ['거든요', '기 때문이다'], ['이에요', '이다'], ['예요', '이다'],
  ['는데요', '는데'], ['아닙니다', '아니다'], ['입니다', '이다'],
];
const CLICHES = [
  '다양한 측면에서', '중요한 역할을 한다', '결론적으로 말하자면', '살펴보면 다음과 같다',
  '시사하는 바가 크다', '많은 사람들이 관심을 가지고 있다', '현대 사회에서',
];
// 자주 틀리는 맞춤법 (틀린 형태가 거의 항상 오류인 것만)
const SPELLING = [
  [/됬/g, '됐'], [/몇\s?일(?=[\s.,]|동안|간|째|이|을|의|에|만|은|부터|까지|$)/g, '며칠'], [/금새/g, '금세'], [/역활/g, '역할'], [/일일히/g, '일일이'],
  [/깨끗히/g, '깨끗이'], [/틈틈히/g, '틈틈이'], [/곰곰히/g, '곰곰이'], [/어의없/g, '어이없'],
  [/왠만/g, '웬만'], [/왠일/g, '웬일'], [/웬지/g, '왠지'], [/희안/g, '희한'], [/설겆이/g, '설거지'],
  [/가르키/g, '가리키'], [/오랫만/g, '오랜만'], [/내노라/g, '내로라'], [/어떻해/g, '어떡해'],
  [/단언컨데/g, '단언컨대'], [/요컨데/g, '요컨대'], [/되서/g, '돼서'], [/있슴/g, '있음'], [/없슴/g, '없음'],
  [/([할줄갈볼올쓸될알])께(?=[\s.!?,요]|$)/g, '$1게'], [/(^|\s)않\s?(된|되|돼)/g, '$1안 $2'],
];
const CONNECTIVES = { 또한: '아울러·더불어', 그리고: '또·아울러', 하지만: '반면·그럼에도', 그러나: '반면·그럼에도', 따라서: '그러므로·이에', 그래서: '이에·그 결과', 게다가: '더욱이·아울러', 특히: '무엇보다' };

// 한글 받침 번호 (없음 0, ㄴ 4, ㄹ 8, …). 한글 음절이 아니면 -1
const jong = ch => { const c = ch ? ch.charCodeAt(0) - 0xAC00 : -1; return c >= 0 && c < 11172 ? c % 28 : -1; };

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

// 원문을 본문과 참고문헌 영역으로 나눈다 (목차에도 "참고문헌"이 있을 수 있어 마지막 제목을 기준으로)
export function splitReferences(text) {
  let m, last = null;
  REF_HEADING_RE.lastIndex = 0;
  while ((m = REF_HEADING_RE.exec(text))) last = m;
  if (!last) return { bodyEnd: text.length, refs: [] };
  const start = last.index + last[0].length;
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
  return { bodyEnd: last.index, refs };
}

// 참고문헌 한 줄에서 저자·연도·제목·출판사를 찾는다. 자신 없으면 null
export function parseRef(raw) {
  let s = ` ${raw.trim()} `;
  let publisher = '';
  s = s.replace(new RegExp(`${LOCATION_RE.source}([^,.]+)`), (...a) => { publisher = a[2].trim(); return a[2]; });
  const ym = s.match(/\(?\s*((?:19|20)\d{2})[a-z]?\s*년?\s*\)?/);
  if (!ym) return null;
  const year = ym[1];
  s = s.replace(ym[0], ' , ');
  let title = '';
  const tm = s.match(/[『「《〈"“]([^』」》〉"”]+)[』」》〉"”]/);
  if (tm) { title = tm[1].trim(); s = s.replace(tm[0], ' , '); }
  const tokens = s.split(/\s*[,.]\s+|\s*,\s*|\.\s*$/)
    .map(t => t.replace(/\s*(저|편|역|지음|엮음|편저|공저)$/, '').trim())
    .filter(Boolean);
  if (!publisher) publisher = tokens.find(t => PUBLISHER_RE.test(t)) || '';
  const author = tokens.find(t => t !== publisher && /^[가-힣]{2,4}$/.test(t) && !PUBLISHER_RE.test(t))
    || tokens.find(t => t !== publisher && /^[가-힣]{2,12}$/.test(t) && t !== title);
  if (!author) return null;
  const rest = tokens.filter(t => t !== author && t !== publisher);
  if (!title) {
    if (rest.length !== 1) return null; // 제목 후보가 여럿이면 추측하지 않음
    title = rest[0];
  } else if (rest.length > 0) return null;
  return { author, year, title, publisher };
}

// 한국식·혼합 표기를 APA 7판 "저자 (연도). 제목. 출판사." 형태로 바꾼다
export function toApa(ref) {
  const p = parseRef(ref);
  if (!p) return null;
  return `${p.author} (${p.year}). ${p.title}.${p.publisher ? ` ${p.publisher}.` : ''}`;
}

// 문장 나누기: 소수점(1.5%)·끝에 붙은 따옴표는 문장 끝으로 보지 않음
function sentences(text, from, to) {
  const out = [];
  let s = from;
  const push = e => {
    const raw = text.slice(s, e);
    const lead = raw.length - raw.trimStart().length;
    const t = raw.trim();
    if (t.length > 1) out.push({ text: t, start: s + lead, end: s + lead + t.length });
  };
  for (let i = from; i < to; i++) {
    const c = text[i];
    if (c === '\n') { push(i); s = i + 1; continue; }
    if (c === '.' || c === '!' || c === '?') {
      const next = text[i + 1];
      if (/\d/.test(text[i - 1] || '') && /\d/.test(next || '')) continue;
      if (i + 1 >= to || /[\s"”’')\]]/.test(next)) {
        let e = i + 1;
        while (e < to && /["”’')\]]/.test(text[e])) e++;
        push(e); s = e; i = e - 1;
      }
    }
  }
  if (s < to) push(to);
  return out;
}

function headingRe(word) {
  return new RegExp(`(^|\\n)${HEAD_PREFIX}${SECTION_WORDS[word] || word}${HEAD_SUFFIX}[^\\n]{0,20}(?=\\n|$)`, 'i');
}
function findHeading(text, word) {
  const m = headingRe(word).exec(text);
  return m ? m.index + m[1].length : -1;
}

// 본문의 인용 표시 찾기: (김철수, 2021), (Smith & Lee, 2020; 통계청, 2023), 김철수(2021)는, Lee(2020)
export function inTextCitations(body) {
  const out = [];
  const par = /\(([^()\n]{3,200})\)/g;
  let m;
  while ((m = par.exec(body))) {
    let off = m.index + 1;
    for (const part of m[1].split(';')) {
      const pm = part.match(/^\s*(.*?[가-힣A-Za-z].*?),\s*((?:19|20)\d{2})[a-z]?(?:\s*,[^;]*)?\s*$/);
      if (pm && !/^(저자|출처|기관|언론사)/.test(pm[1].trim())) {
        out.push({ author: pm[1].trim(), year: pm[2], start: m.index, end: m.index + m[0].length, kind: 'paren' });
      }
      off += part.length + 1;
    }
  }
  const nar = /([가-힣]{2,12}|[A-Z][A-Za-z'’-]+(?:\s+et al\.)?)\s?\(((?:19|20)\d{2})[a-z]?(?:,\s*[^()]*)?\)/g;
  while ((m = nar.exec(body))) {
    out.push({ author: m[1].replace(/\s+et al\.$/, ''), year: m[2], start: m.index, end: m.index + m[0].length, kind: 'narrative' });
  }
  return out;
}

const norm = s => s.toLowerCase().replace(/[\s.,&]/g, '');
function refKey(ref) {
  const m = ref.text.match(/^(.*?)\s?\(((?:19|20)\d{2})[a-z]?(?:,[^)]*)?\)/) || ref.text.match(/^(.*?)\b((?:19|20)\d{2})/);
  return m ? { authors: norm(m[1]), first: norm(m[1].split(/[,.(]/)[0]), year: m[2] } : null;
}
function citeMatches(c, k) {
  if (!k || c.year !== k.year) return false;
  const a = norm(c.author.replace(/\s(외|등|와|과|및)(\s.*)?$/, '').split(/\s(?:&|and|와|과)\s/)[0]);
  return !!a && (k.authors.includes(a) || a.includes(k.first));
}

export function analyze({ text = '', tags = [], instructions = '', targetLength = 0 } = {}) {
  const req = deriveRequirements(tags, instructions, targetLength);
  const issues = [];
  let seq = 0;
  const add = (o) => issues.push({ id: `i${++seq}`, start: -1, end: -1, fix: null, ...o });

  const { bodyEnd, refs } = splitReferences(text);
  const body = text.slice(0, bodyEnd);
  const bodyChars = body.replace(/\s+/g, ' ').trim().length;
  const bodySentences = sentences(text, 0, bodyEnd);

  // 1) 참고문헌 목록·형식
  if (req.needCitation && refs.length === 0) {
    add({ severity: 'danger', category: 'citation', title: '참고문헌 목록 없음',
      reason: '교수님이 출처 표기를 요구했는데 참고문헌 목록이 없어요.',
      suggestion: '글 끝에 "참고문헌" 제목을 달고 사용한 자료를 APA 형식으로 정리하세요.', gain: 6 });
  }
  for (const ref of refs) {
    if (!req.apa) break;
    if (!APA_REF_RE.test(ref.text)) {
      const fixed = toApa(ref.text);
      add({ severity: 'danger', category: 'citation', title: 'APA 양식 아님', start: ref.start, end: ref.end, group: 'refs',
        reason: '교수님이 말한 APA 7판 형식(저자 (연도). 제목. 출판사.)과 달라요.',
        suggestion: fixed ? `${fixed}  (책 제목은 이탤릭체로)` : '저자 (연도). 제목. 출판사. 순서로 고치세요. 저자·연도·제목을 모두 적어야 해요.',
        fix: fixed, gain: 2 });
    } else if (LOCATION_RE.test(ref.text)) {
      const fixed = ref.text.replace(LOCATION_RE, '');
      add({ severity: 'danger', category: 'citation', title: '출판사 위치 표기', start: ref.start, end: ref.end, group: 'refs',
        reason: 'APA 7판부터는 출판사 위치(예: 서울:)를 쓰지 않아요.', suggestion: fixed, fix: fixed, gain: 2 });
    }
  }

  // 2) 본문 인용 ↔ 참고문헌 목록 대조
  const cites = inTextCitations(body);
  const keyed = refs.map(r => ({ ref: r, key: refKey(r) })).filter(x => x.key);
  if (refs.length && keyed.length) {
    if (cites.length === 0 && req.needCitation) {
      add({ severity: 'danger', category: 'citation', title: '본문 인용 표시 없음',
        reason: '참고문헌은 있는데 본문 어디에도 (저자, 연도) 표시가 없어요. 어느 문장이 어느 자료에서 왔는지 알 수 없어요.',
        suggestion: '자료를 가져온 문장 끝에 (저자, 연도)를 붙이세요. 예: …감소하였다(통계청, 2023).', gain: 3 });
    } else {
      const seen = new Set();
      for (const c of cites) {
        if (keyed.some(x => citeMatches(c, x.key))) continue;
        const id = `${norm(c.author)}|${c.year}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const sameAuthor = keyed.find(x => citeMatches({ ...c, year: x.key.year }, x.key));
        add({ severity: req.needCitation ? 'danger' : 'warning', category: 'citation', group: 'refs',
          title: sameAuthor ? '인용 연도 불일치' : '참고문헌에 없는 인용', start: c.start, end: c.end,
          reason: sameAuthor
            ? `본문은 ${c.year}년인데 참고문헌에는 ${sameAuthor.key.year}년으로 적혀 있어요.`
            : `본문에서 ${c.author}(${c.year})를 인용했는데 참고문헌 목록에 없어요.`,
          suggestion: sameAuthor ? '본문과 참고문헌의 연도를 같게 맞추세요.' : `참고문헌에 "${c.author} (${c.year}). 제목. 출판사."를 추가하세요.`,
          gain: 2 });
      }
      for (const x of keyed) {
        if (cites.some(c => citeMatches(c, x.key))) continue;
        add({ severity: 'warning', category: 'citation', title: '본문에서 안 쓴 참고문헌', start: x.ref.start, end: x.ref.end, group: 'refs',
          reason: '참고문헌에는 있는데 본문에서 인용한 곳이 없어요. 읽지 않은 자료를 늘어놓은 것처럼 보일 수 있어요.',
          suggestion: '이 자료를 쓴 문장에 (저자, 연도)를 붙이거나, 쓰지 않았다면 목록에서 빼세요.', gain: 1 });
      }
    }
  }

  // 3) 출처 자리 표시가 남아 있음 (자동 수정 후 채우지 않은 것)
  for (const m of body.matchAll(PLACEHOLDER_RE)) {
    add({ severity: 'warning', category: 'citation', title: '출처 채우기', start: m.index, end: m.index + m[0].length,
      reason: '출처 자리 표시가 그대로 남아 있어요. 제출 전에 실제 저자와 연도로 바꿔야 해요.',
      suggestion: '예: (통계청, 2023), (김철수, 2021)', gain: 1 });
  }

  // 4) 출처 없는 직접 인용 (인용 앞에 "김철수(2021)는"처럼 출처를 밝힌 경우는 통과)
  const quoteRe = /["“]([^"”\n]{8,})["”]/g;
  let q, unsourcedQuoteChars = 0;
  while ((q = quoteRe.exec(body))) {
    const after = body.slice(q.index + q[0].length, q.index + q[0].length + 40);
    const lineStart = body.lastIndexOf('\n', q.index) + 1;
    const before = body.slice(Math.max(lineStart, q.index - 100), q.index);
    const lastStop = Math.max(before.lastIndexOf('. '), before.lastIndexOf('다.'));
    PLACEHOLDER_RE.lastIndex = 0;
    if (PLACEHOLDER_RE.test(after)) { PLACEHOLDER_RE.lastIndex = 0; continue; }
    if (CITATION_RE.test(after) || CITATION_RE.test(lastStop >= 0 ? before.slice(lastStop + 1) : before)) continue;
    unsourcedQuoteChars += q[1].length;
    add({ severity: 'danger', category: 'citation', title: '출처 없는 직접 인용',
      start: q.index, end: q.index + q[0].length,
      reason: '따옴표로 가져온 문장 앞뒤에 출처가 없어 표절로 볼 수 있어요.',
      suggestion: '인용 바로 뒤에 (저자, 연도)를 붙이거나, 내 말로 바꿔 쓰세요(패러프레이징).',
      fix: `${q[0]}(저자, 연도)`, gain: 3 });
  }

  // 5) 근거 없는 수치
  if (req.needCitation || req.strict) {
    for (const s of bodySentences) {
      if (/\d+(\.\d+)?\s*(%|퍼센트|배|명|억|만\s*원|조\s*원)/.test(s.text) && !CITATION_RE.test(s.text) && !PLACEHOLDER_RE.test(s.text)) {
        add({ severity: req.strict ? 'danger' : 'warning', category: 'citation', title: '근거 없는 수치',
          start: s.start, end: s.end,
          reason: req.strict ? '팩트에 깐깐한 교수님이에요. 통계·수치에는 반드시 출처가 필요해요.' : '수치를 인용했는데 출처가 없어요.',
          suggestion: '문장 끝에 (기관명, 연도) 형식으로 출처를 밝히세요.',
          fix: s.text.replace(/([.!?]?)$/, '(출처, 연도)$1'), gain: req.strict ? 3 : 2 });
      }
      PLACEHOLDER_RE.lastIndex = 0;
    }
  }

  // 6) 구어체·존댓말 어미·1인칭 존칭
  for (const [word, rep] of COLLOQUIAL) {
    const re = new RegExp(`(^|[\\s(])(${word})(?=[\\s,.])`, 'g');
    let m;
    while ((m = re.exec(body))) {
      const st = m.index + m[1].length;
      add({ severity: 'warning', category: 'style', title: '구어체 표현', start: st, end: st + word.length, group: 'polite',
        reason: `"${word}"는 말할 때 쓰는 표현이라 보고서 톤에 맞지 않아요.`, suggestion: rep, fix: rep, gain: 1 });
    }
  }
  for (const [word, rep] of COLLOQUIAL_STEM) {
    const re = new RegExp(`(^|[\\s(])${word}`, 'g');
    let m;
    while ((m = re.exec(body))) {
      const st = m.index + m[1].length;
      add({ severity: 'warning', category: 'style', title: '구어체 표현', start: st, end: st + word.length, group: 'polite',
        reason: `"${word}"는 말할 때 쓰는 표현이에요.`, suggestion: rep, fix: rep, gain: 1 });
    }
  }
  const politeTaken = [];
  for (const [end, rep] of POLITE_ENDINGS) {
    const re = new RegExp(`${end}(?=[.!?,\\s]|$)`, 'g');
    let m;
    while ((m = re.exec(body))) {
      if (politeTaken.some(([a, b]) => m.index < b && m.index + end.length > a)) continue;
      politeTaken.push([m.index, m.index + end.length]);
      add({ severity: 'warning', category: 'style', title: '보고서 어미 아님', start: m.index, end: m.index + end.length, group: 'polite',
        reason: '보고서는 "-다" 체로 쓰는 것이 기본이에요.', suggestion: rep, fix: rep, gain: 1 });
    }
  }
  // "-습니다"는 받침 있는 줄기 + 다 로 바꾸면 됨 (있습니다→있다, 했습니다→했다)
  for (const m of body.matchAll(/([가-힣])습니다(?=[.!?,\s]|$)/g)) {
    if (politeTaken.some(([a, b]) => m.index < b && m.index + m[0].length > a)) continue;
    politeTaken.push([m.index, m.index + m[0].length]);
    add({ severity: 'warning', category: 'style', title: '보고서 어미 아님', start: m.index, end: m.index + m[0].length, group: 'polite',
      reason: '보고서는 "-습니다"가 아니라 "-다" 체로 써요.', suggestion: `${m[1]}다`, fix: `${m[1]}다`, gain: 1 });
  }
  // "-ㅂ니다"(합니다·됩니다)는 동사·형용사에 따라 바뀌는 꼴이 달라서 자동 수정은 하지 않음
  for (const m of body.matchAll(/([가-힣])니다(?=[.!?,\s]|$)/g)) {
    if (jong(m[1]) !== 17 || politeTaken.some(([a, b]) => m.index < b && m.index + m[0].length > a)) continue;
    add({ severity: 'warning', category: 'style', title: '보고서 어미 아님', start: m.index, end: m.index + m[0].length, group: 'polite',
      reason: '보고서는 "-니다"가 아니라 "-다" 체로 써요.', suggestion: '예: 합니다 → 한다(동사)/하다(형용사), 됩니다 → 된다', gain: 1 });
  }
  for (const m of body.matchAll(/(^|[\s"“(])(저는|제가|저의|저희는|저희가)(?=\s)/g)) {
    const st = m.index + m[1].length;
    const rep = { 저는: '필자는', 제가: '필자가', 저의: '필자의', 저희는: '우리는', 저희가: '우리가' }[m[2]];
    add({ severity: 'warning', category: 'style', title: '존칭 1인칭', start: st, end: st + m[2].length, group: 'polite',
      reason: `보고서에서 "${m[2]}"처럼 자신을 낮추는 말은 쓰지 않아요.`, suggestion: rep, fix: rep, gain: 1 });
  }
  if (req.strict) {
    for (const m of body.matchAll(/(^|[\s"“(])(나는|내가|나의)(?=\s)/g)) {
      const st = m.index + m[1].length;
      add({ severity: 'warning', category: 'style', title: '1인칭 표현', start: st, end: st + m[2].length, group: 'polite',
        reason: '객관성을 중시하는 교수님이에요. 개인 감상처럼 읽히는 1인칭은 줄이는 게 좋아요.',
        suggestion: '"본 보고서는", "필자는"으로 바꾸거나 주어 없이 쓰세요.', gain: 1 });
    }
  }

  // 7) 맞춤법·띄어쓰기 (자주 틀리는 것만, 바로 고칠 수 있게)
  const spell = (st, en, fix, title, reason) => add({ severity: 'warning', category: 'style', title, start: st, end: en, fix, suggestion: fix, reason, gain: 1, group: 'spell' });
  for (const [re, rep] of SPELLING) {
    for (const m of body.matchAll(re)) {
      const fix = m[0].replace(new RegExp(re.source), rep);
      if (fix !== m[0]) spell(m.index, m.index + m[0].length, fix, '맞춤법', `"${m[0].trim()}"은(는) "${fix.trim()}"이 맞아요.`);
    }
  }
  for (const m of body.matchAll(/([가-힣])([가-힣])(율|률)/g)) {
    const right = jong(m[2]) === 0 || jong(m[2]) === 4 ? '율' : '률';
    if (right !== m[3]) spell(m.index + 1, m.index + 3, `${m[2]}${right}`, '맞춤법', `받침이 ${jong(m[2]) ? 'ㄴ이 아닌 ' : ''}글자 뒤에는 "${right}"을 써요. (예: 출산율, 합격률)`);
  }
  for (const m of body.matchAll(/([가-힣])(\s?)수(\s?)(있|없)/g)) {
    if (jong(m[1]) === 8 && (!m[2] || !m[3])) spell(m.index, m.index + m[0].length, `${m[1]} 수 ${m[4]}`, '띄어쓰기', '"수"는 앞뒤를 띄어 써요. (예: 할 수 있다)');
  }
  for (const m of body.matchAll(/([가-힣])것(?=[이을은도만과으에의\s.,]|$)/g)) {
    if ((jong(m[1]) === 4 || jong(m[1]) === 8) && !['날', '별'].includes(m[1])) spell(m.index, m.index + 2, `${m[1]} 것`, '띄어쓰기', '"것"은 앞말과 띄어 써요. (예: 하는 것)');
  }
  for (const m of body.matchAll(/([가-힣])때문/g)) spell(m.index, m.index + 3, `${m[1]} 때문`, '띄어쓰기', '"때문"은 앞말과 띄어 써요. (예: 그렇기 때문에)');
  for (const m of body.matchAll(/([가-힣])지않/g)) spell(m.index, m.index + 3, `${m[1]}지 않`, '띄어쓰기', '"-지 않다"는 띄어 써요. (예: 하지 않는다)');
  for (const m of body.matchAll(/뿐만아니라/g)) spell(m.index, m.index + 5, '뿐만 아니라', '띄어쓰기', '"뿐만 아니라"로 띄어 써요.');

  // 8) 상투 표현 (AI 생성 문체 의심)
  let clicheCount = 0;
  for (const c of CLICHES) {
    let idx = body.indexOf(c);
    while (idx !== -1) {
      clicheCount++;
      add({ severity: 'warning', category: 'style', title: 'AI 문체 의심 표현', start: idx, end: idx + c.length, group: 'cliche',
        reason: '어디서나 쓰이는 상투 표현이라 AI가 쓴 글처럼 보일 수 있어요.',
        suggestion: '구체적인 근거나 내 생각을 담은 표현으로 바꿔 보세요.', gain: 1 });
      idx = body.indexOf(c, idx + c.length);
    }
  }

  // 9) 같은 접속어로 연달아 시작하는 문장
  let prevFirst = '';
  for (const s of bodySentences) {
    const first = (s.text.match(/^[가-힣]+/) || [''])[0].replace(/(는|도)$/, '');
    if (CONNECTIVES[first] && first === prevFirst) {
      add({ severity: 'warning', category: 'style', title: '같은 접속어 반복', start: s.start, end: s.start + first.length, group: 'cliche',
        reason: `앞 문장도 "${first}"(으)로 시작해요. 같은 접속어가 이어지면 글이 단조로워 보여요.`,
        suggestion: `${CONNECTIVES[first]} 등으로 바꾸거나 두 문장을 하나로 합치세요.`, gain: 1 });
    }
    prevFirst = first;
  }

  // 10) 너무 긴 문장·문단
  for (const s of bodySentences) {
    if (s.text.length > 140) {
      add({ severity: 'warning', category: 'style', title: '너무 긴 문장', start: s.start, end: s.end,
        reason: `한 문장이 ${s.text.length}자예요. 논리가 흐려 보일 수 있어요.`,
        suggestion: '두세 문장으로 나누고 접속어로 연결하세요.', gain: req.logic ? 2 : 1 });
    }
  }
  let off = 0;
  for (const line of body.split('\n')) {
    const len = line.trim().length;
    if (len > 900) {
      const st = off + line.length - line.trimStart().length;
      add({ severity: 'warning', category: 'style', title: '문단이 너무 김', start: st, end: st + Math.min(60, len),
        reason: `한 문단이 ${len.toLocaleString()}자예요. 읽는 사람이 요점을 놓치기 쉬워요.`,
        suggestion: '생각이 바뀌는 곳에서 문단을 나누세요. 한 문단에 한 가지 주장이 좋아요.', gain: 1 });
    }
    off += line.length + 1;
  }

  // 11) 표·그림 번호 건너뜀
  for (const kind of ['표', '그림']) {
    const nums = new Map();
    for (const m of body.matchAll(new RegExp(`(?:^|[\\s<\\[【〈(])${kind}\\s?(\\d{1,2})(?![\\d.])`, 'g'))) {
      const n = Number(m[1]);
      if (!nums.has(n)) nums.set(n, m.index + m[0].indexOf(kind));
    }
    const sorted = [...nums.keys()].sort((a, b) => a - b);
    const missing = sorted.length ? Array.from({ length: sorted[sorted.length - 1] }, (_, i) => i + 1).filter(n => !nums.has(n)) : [];
    if (missing.length) {
      const next = sorted.find(n => n > missing[0]);
      const st = nums.get(next);
      add({ severity: 'warning', category: 'style', title: `${kind} 번호 건너뜀`, start: st, end: st + kind.length + 1 + String(next).length,
        reason: `${kind} ${missing.join(', ')}이(가) 없는데 ${kind} ${next}이(가) 나와요.`,
        suggestion: `${kind} 번호를 1부터 차례대로 매기세요.`, gain: 1 });
    }
  }

  // 12) 서론-본론-결론 구조 (들어가며·맺음말 같은 다른 이름도 인정)
  if (req.structure) {
    const iPos = findHeading(body, '서론');
    const cPos = findHeading(body, '결론');
    const middle = iPos !== -1 && cPos > iPos ? body.slice(iPos, cPos).split('\n').slice(1).join('\n').replace(/\s+/g, '').length : 0;
    const has = { 서론: iPos !== -1, 본론: findHeading(body, '본론') !== -1 || middle >= 300, 결론: cPos !== -1 };
    for (const w of ['서론', '본론', '결론']) {
      if (!has[w]) {
        add({ severity: 'danger', category: 'instruction', title: `'${w}' 구성 없음`,
          reason: `서론-본론-결론 구조를 중시하는 교수님인데 '${w}' 부분이 보이지 않아요.`,
          suggestion: `'${w}' 소제목을 달고 해당 내용을 정리하세요.`, gain: 4 });
      }
    }
  }

  // 13) 서론 뉴스 기사 인용 (구두 지시사항)
  if (req.newsInIntro) {
    const iStart = findHeading(body, '서론');
    let intro;
    if (iStart !== -1) {
      const rest = body.slice(iStart + 2);
      const next = ['본론', '결론'].map(w => findHeading(rest, w)).filter(i => i !== -1);
      const numbered = rest.search(/\n[ \t]*(?:\d{1,2}|[IVX]{1,4}|[Ⅰ-Ⅻ])\s*[.)][^\n]{1,30}(?=\n)/);
      if (numbered !== -1) next.push(numbered);
      intro = body.slice(iStart, next.length ? iStart + 2 + Math.min(...next) : body.length);
    } else {
      intro = body.split(/\n\s*\n/).slice(0, 2).join('\n');
    }
    if (!/(뉴스|기사|보도|일보|신문|방송|news)/i.test(intro)) {
      add({ severity: 'danger', category: 'instruction', title: '서론에 뉴스 인용 없음',
        reason: '수업 때 교수님이 "서론에 뉴스 기사를 인용하라"고 했는데 서론에서 찾을 수 없어요.',
        suggestion: '서론 첫 문단에 관련 기사 한 줄을 인용하고 (언론사, 연도)를 붙이세요.', gain: 4 });
    }
  }

  // 14) 분량
  if (req.length > 0) {
    const ratio = bodyChars / req.length;
    if (ratio < 0.95) {
      const danger = ratio < 0.8 || req.strictLength;
      add({ severity: danger ? 'danger' : 'warning', category: 'length', title: '분량 미달',
        reason: `본문이 ${bodyChars.toLocaleString()}자(공백 포함, 참고문헌 제외)로, 요구 분량 ${req.length.toLocaleString()}자의 ${Math.round(ratio * 100)}%예요.`,
        suggestion: `${(req.length - bodyChars).toLocaleString()}자 정도 더 쓰세요. 본론의 근거를 보강하면 좋아요.`,
        gain: Math.min(16, Math.round((1 - ratio) * 40)) || 1 });
    } else if (ratio > (req.strictLength ? 1.1 : 1.3)) {
      add({ severity: 'warning', category: 'length', title: '분량 초과',
        reason: `요구 분량보다 ${Math.round((ratio - 1) * 100)}% 길어요.`,
        suggestion: '중복되는 문단을 줄여 핵심만 남기세요.', gain: req.strictLength ? 4 : 2 });
    }
  }

  // 같은 자리를 두 규칙이 겹쳐 지적하면 하나만 남김 (예: "됬다" 맞춤법 + 다른 표시)
  const dedup = [];
  for (const i of issues) {
    if (i.start >= 0 && dedup.some(d => d.start === i.start && d.end === i.end && d.title === i.title)) continue;
    dedup.push(i);
  }
  return finalize({ text, issues: dedup, req, bodyChars, unsourcedQuoteChars, clicheCount, instructions });
}

// 같은 종류 감점이 끝없이 쌓이지 않게 묶음별 상한 (맞춤법 100개면 100점 깎이는 일 방지)
const GROUP_CAP = { spell: 5, polite: 6, cliche: 4, refs: 8 };

export function scoreOf(issues) {
  const rubric = RUBRIC.map(r => {
    const groups = {};
    let lost = 0;
    for (const i of issues.filter(x => x.category === r.key)) {
      if (i.group && GROUP_CAP[i.group]) {
        const used = groups[i.group] || 0;
        const take = Math.max(0, Math.min(i.gain, GROUP_CAP[i.group] - used));
        groups[i.group] = used + take;
        lost += take;
      } else lost += i.gain;
    }
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
    .map(s => ({ text: s, auto: /APA|참고\s*문헌|출처|인용|뉴스|기사|서론|본론|결론|\d+\s*자|맞춤법|띄어쓰기|표|그림|존댓말|구어/i.test(s) }));

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
