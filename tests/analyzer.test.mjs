import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, toApa, applyFix, gradeOf, deriveRequirements, splitReferences } from '../js/analyzer.js';
import { SAMPLE } from '../js/sample.js';

test('한국식 참고문헌을 APA 7판으로 변환', () => {
  assert.equal(toApa('홍길동 (2023), 『인공지능과 교육』, 한빛출판.'), '홍길동. (2023). 인공지능과 교육. 한빛출판.');
  assert.equal(toApa('김철수. 2021. 거시경제학 원론. 서울: 박영사.'), '김철수. (2021). 거시경제학 원론. 박영사.');
});

test('구두 지시사항에서 요구사항 추출', () => {
  const r = deriveRequirements([], '참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것, 2,000자 이상');
  assert.equal(r.apa, true);
  assert.equal(r.newsInIntro, true);
  assert.equal(r.length, 2000);
});

test('참고문헌 영역 분리', () => {
  const { refs } = splitReferences('본문입니다.\n\n참고문헌\n홍길동. (2023). 제목. 출판사.\n');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].text, '홍길동. (2023). 제목. 출판사.');
});

test('예시 과제에서 핵심 감점 요소를 찾는다', () => {
  const r = analyze(SAMPLE);
  const titles = r.issues.map(i => i.title);
  assert.ok(titles.includes('APA 양식 아님'), titles.join(','));
  assert.ok(titles.includes('출처 없는 직접 인용'));
  assert.ok(titles.includes('서론에 뉴스 인용 없음'));
  assert.ok(titles.includes('구어체 표현'));
  assert.ok(r.score < 90 && r.score > 40, `score ${r.score}`);
  assert.ok(r.potential.score > r.score);
  assert.equal(r.mood, 'danger');
});

test('수정안을 적용하면 해당 감점이 사라진다', () => {
  let text = SAMPLE.text;
  for (let round = 0; round < 30; round++) {
    const r = analyze({ ...SAMPLE, text });
    const fixable = r.issues.find(i => i.fix != null && i.title !== '출처 없는 직접 인용' && i.title !== '근거 없는 수치');
    if (!fixable) break;
    text = applyFix(text, fixable);
  }
  const after = analyze({ ...SAMPLE, text });
  assert.ok(!after.issues.some(i => i.title === 'APA 양식 아님'));
  assert.ok(!after.issues.some(i => i.title === '구어체 표현'));
  assert.ok(after.score > analyze(SAMPLE).score);
});

test('깨끗한 글은 A+ 유력', () => {
  const text = '서론\n2024년 한국은행 보도에 따르면 물가 상승률이 둔화되었다(한국은행, 2024).\n\n본론\n통화정책의 효과는 시차를 두고 나타난다(김철수, 2021).\n\n결론\n정책의 일관성이 필요하다.\n\n참고문헌\n김철수. (2021). 거시경제학 원론. 박영사.\n한국은행. (2024). 통화신용정책 보고서. 한국은행.';
  const r = analyze({ text, tags: ['structure', 'cite'], instructions: '참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것' });
  assert.deepEqual(r.issues.map(i => i.title), []);
  assert.equal(r.grade, 'A+');
  assert.equal(r.mood, 'safe');
});

test('학점 구간', () => {
  assert.equal(gradeOf(100), 'A+');
  assert.equal(gradeOf(90), 'A0');
  assert.equal(gradeOf(84), 'B0');
  assert.equal(gradeOf(50), 'F');
});
