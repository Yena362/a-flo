// 참고문헌 형식 선택 (자동 · APA · MLA · 시카고 · 국내 학술지식)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, formatRef, deriveRequirements, applyFix, CITE_STYLES } from '../js/analyzer.js';

const REF = '홍길동 (2023), 『인공지능과 교육』, 한빛출판.';
const doc = ref => `서론\n인공지능은 교육을 바꾸고 있다(홍길동, 2023).\n\n참고문헌\n${ref}`;
const styleIssues = (text, citeStyle) => analyze({ text, tags: ['cite'], citeStyle }).issues.filter(i => /양식 아님$/.test(i.title));

test('형식별 참고문헌 변환', () => {
  assert.equal(formatRef(REF, 'apa'), '홍길동 (2023). 인공지능과 교육. 한빛출판.');
  assert.equal(formatRef(REF, 'mla'), '홍길동. 인공지능과 교육. 한빛출판, 2023.');
  assert.equal(formatRef(REF, 'chicago'), '홍길동. 2023. 인공지능과 교육. 한빛출판.');
  assert.equal(formatRef(REF, 'kr'), '홍길동(2023). 『인공지능과 교육』. 한빛출판.');
});

test('직접 고른 형식이 지시사항보다 먼저', () => {
  assert.equal(deriveRequirements([], '참고문헌 APA 필수', 0, 'mla').citeStyle, 'mla');
  assert.equal(deriveRequirements([], '참고문헌 APA 필수', 0, 'auto').citeStyle, 'apa');
  assert.equal(deriveRequirements([], 'MLA 형식으로 쓸 것').citeStyle, 'mla');
  assert.equal(deriveRequirements([], '시카고 스타일').citeStyle, 'chicago');
  assert.equal(deriveRequirements(['cite'], '').citeStyle, 'apa');
  assert.equal(deriveRequirements([], '').citeStyle, null, '아무 요구가 없으면 형식 검사 안 함');
  assert.equal(deriveRequirements([], '', 0, 'kr').needCitation, true, '형식을 고르면 출처가 필요하다고 봄');
});

test('고른 형식으로 검사하고, 수정안을 적용하면 통과', () => {
  // 제목이 앞에 오고 '저'·'년'이 붙은 표기는 어느 형식에도 맞지 않음
  const BAD = '『인공지능과 교육』, 홍길동 저, 2023년, 파주: 한빛출판';
  for (const style of ['apa', 'mla', 'chicago', 'kr']) {
    const text = doc(BAD);
    const found = styleIssues(text, style);
    assert.equal(found.length, 1, `${style}: 뒤섞인 표기는 형식 오류`);
    assert.equal(found[0].title, `${CITE_STYLES[style].short} 양식 아님`);
    const fixed = applyFix(text, found[0]);
    assert.equal(styleIssues(fixed, style).length, 0, `${style}: 고친 뒤에는 통과`);
  }
});

test('맞는 형식은 지적하지 않음', () => {
  for (const style of ['apa', 'mla', 'chicago', 'kr']) {
    assert.equal(styleIssues(doc(CITE_STYLES[style].example), style).length, 0, `${style} 예시는 통과`);
  }
});

test('MLA는 본문 (저자, 연도) 대조를 하지 않음', () => {
  const text = '서론\n인공지능은 교육을 바꾸고 있다(홍길동 12).\n\n참고문헌\n홍길동. 인공지능과 교육. 한빛출판, 2023.';
  const titles = analyze({ text, citeStyle: 'mla' }).issues.map(i => i.title);
  assert.ok(!titles.includes('본문 인용 표시 없음'));
  assert.ok(!titles.includes('본문에서 안 쓴 참고문헌'));
});
