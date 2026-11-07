// 실제 과제처럼 쓴 보고서 3편으로 오탐(잘 쓴 글을 깎음)·누락(틀린 곳을 못 잡음)을 확인
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze, applyFix } from '../js/analyzer.js';

const load = n => readFileSync(new URL(`./fixtures/reports/${n}.txt`, import.meta.url), 'utf8');
const INPUT = { tags: ['cite', 'structure'], instructions: '참고문헌 APA 필수, 서론에 뉴스 기사 인용할 것' };
const titles = r => r.issues.map(i => i.title);

test('잘 쓴 APA 보고서(Ⅰ. 서론 · Ⅳ. 참고문헌 · DOI · 서술형 인용)는 지적 없음', () => {
  const r = analyze({ ...INPUT, text: load('good-apa') });
  assert.deepEqual(titles(r), []);
  assert.equal(r.grade, 'A+');
});

test('엉성한 보고서에서 심어 둔 오류를 모두 찾는다', () => {
  const text = load('sloppy');
  const r = analyze({ ...INPUT, text });
  const t = titles(r);
  for (const want of ['서론에 뉴스 인용 없음', '본문 인용 표시 없음', '출처 없는 직접 인용', 'APA 양식 아님', '구어체 표현', '보고서 어미 아님', '맞춤법', '띄어쓰기', 'AI 문체 의심 표현', '같은 접속어 반복']) {
    assert.ok(t.includes(want), `${want} 누락: ${t.join(', ')}`);
  }
  const fixes = r.issues.filter(i => i.title === '맞춤법' || i.title === '띄어쓰기').map(i => `${text.slice(i.start, i.end)}→${i.fix}`);
  for (const f of ['됬→됐', '몇일→며칠', '금새→금세', '역활→역할', '일수 있→일 수 있', '는것→는 것', '기때문→기 때문']) assert.ok(fixes.includes(f), `${f} 없음: ${fixes.join(' ')}`);
  assert.equal(r.mood, 'danger');
  assert.ok(r.score < 70, `score ${r.score}`);
});

test('다른 이름의 섹션(들어가며·맺음말·[참고문헌])과 인용 앞 출처를 인정한다', () => {
  const r = analyze({ tags: ['cite', 'structure'], instructions: '참고문헌 APA 필수', text: load('variants') });
  const t = titles(r);
  assert.ok(!t.some(x => /구성 없음|참고문헌 목록 없음|출처 없는 직접 인용|APA/.test(x)), t.join(', '));
  const unused = r.issues.filter(i => i.title === '본문에서 안 쓴 참고문헌');
  assert.equal(unused.length, 1);
  assert.match(load('variants').slice(unused[0].start, unused[0].end), /^김하늘/);
  assert.ok(t.includes('표 번호 건너뜀'));
});

test('자동 수정안을 모두 적용하면 점수가 오르고 같은 지적이 다시 생기지 않는다', () => {
  let text = load('sloppy');
  const first = analyze({ ...INPUT, text });
  for (let round = 0; round < 60; round++) {
    const fixable = analyze({ ...INPUT, text }).issues.find(i => i.fix != null && i.start >= 0);
    if (!fixable) break;
    text = applyFix(text, fixable);
  }
  const after = analyze({ ...INPUT, text });
  assert.ok(after.score > first.score + 10, `${first.score} → ${after.score}`);
  for (const gone of ['APA 양식 아님', '구어체 표현', '맞춤법', '띄어쓰기', '출처 없는 직접 인용', '근거 없는 수치']) {
    assert.ok(!titles(after).includes(gone), `${gone}이(가) 남음`);
  }
  assert.ok(titles(after).includes('출처 채우기'), '자리 표시는 채우라고 알려 줘야 함');
});

test('맞춤법·띄어쓰기 규칙은 맞게 쓴 말을 건드리지 않는다', () => {
  const ok = '서론\n그것은 날것 그대로이다. 이러한 것을 할 수 있다. 출산율과 합격률, 비율, 효율, 법률, 환율, 실업률을 본다. 몇 일본 기업이 하지 않는다. 그 때문에 별것 아니다. 증가율은 1.5%였다(통계청, 2023).\n';
  const r = analyze({ text: ok });
  assert.deepEqual(r.issues.filter(i => ['맞춤법', '띄어쓰기'].includes(i.title)).map(i => ok.slice(i.start, i.end)), []);
  const bad = '취업율과 출산률이 할수있다 하는것 때문';
  const fx = analyze({ text: bad }).issues.filter(i => ['맞춤법', '띄어쓰기'].includes(i.title)).map(i => `${bad.slice(i.start, i.end)}→${i.fix}`);
  assert.deepEqual(fx.sort(), ['산률→산율', '업율→업률', '할수있→할 수 있', '는것→는 것'].sort());
});

test('-습니다·-ㅂ니다체를 하나씩만 잡는다', () => {
  const text = '이 제도는 효과가 있습니다. 정부가 지원합니다. 문제는 크지 않습니다.';
  const r = analyze({ text });
  const p = r.issues.filter(i => i.title === '보고서 어미 아님').map(i => `${text.slice(i.start, i.end)}→${i.fix}`);
  assert.deepEqual(p.sort(), ['있습니다→있다', '않습니다→않다', '합니다→null'].sort());
});

test('같은 종류 감점은 상한이 있어 맞춤법만으로 낙제하지 않는다', () => {
  const text = `서론\n${'그렇기때문에 됬다. '.repeat(30)}`;
  const r = analyze({ text });
  assert.ok(r.issues.filter(i => i.title === '맞춤법' || i.title === '띄어쓰기').length >= 30);
  assert.ok(r.score >= 90, `score ${r.score}`);
});
