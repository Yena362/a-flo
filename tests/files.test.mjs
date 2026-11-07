import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractHwpText, readCfb, paraTextToString, HwpError } from '../js/hwp.js';
import { extractHwpxText, readAssignmentFile } from '../js/docx.js';

const load = async name => {
  const b = await readFile(new URL(`./fixtures/${name}`, import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

test('HWP: 복합 파일에서 스트림 목록 읽기', async () => {
  const cfb = readCfb(new Uint8Array(await load('sample.hwp')));
  assert.deepEqual(cfb.list(['BodyText']).map(e => e.name).sort(), ['Section0', 'Section1']);
  assert.ok(cfb.read(['FileHeader']).length === 256, '작은 스트림(미니 스트림) 읽기');
  assert.ok(cfb.read(['BodyText', 'Section1']).length >= 4096, '큰 스트림(일반 섹터) 읽기');
});

test('HWP: 압축된 본문 문단을 순서대로 추출 (탭·제어 문자 처리, 긴 문단)', async () => {
  const text = await extractHwpText(await load('sample.hwp'));
  const lines = text.split('\n');
  assert.equal(lines[0], '서론');
  assert.equal(lines[1], '최근 금리 인상이 가계에 미치는 영향은 크다.\t(한국은행, 2024)');
  assert.ok(lines[2].startsWith('본론 금리가 오르면'));
  assert.ok(lines[2].length > 2500, '4096바이트 넘는 문단(확장 레코드 크기, 일반 섹터) 읽기');
  assert.equal(lines.at(-1), '결론');
  assert.ok(!/secd/.test(text), '구역 정의 같은 제어 문자는 글자로 나오지 않음');
});

test('HWP: 암호 걸린 파일·다른 형식은 알아듣기 쉬운 오류', async () => {
  await assert.rejects(extractHwpText(await load('locked.hwp')), e => e instanceof HwpError && /암호/.test(e.message));
  await assert.rejects(extractHwpText(new TextEncoder().encode('not a hwp file'.padEnd(600, '.')).buffer), e => /형식이 아니에요/.test(e.message));
});

test('HWP: 제어 문자 길이 규칙', () => {
  const u16 = arr => new Uint8Array(new Uint16Array(arr).buffer);
  // 'A' + 탭(8글자) + 'B' + 줄바꿈(1글자) + 'C' + 문단 끝
  assert.equal(paraTextToString(u16([65, 9, 0, 0, 0, 0, 0, 0, 9, 66, 10, 67, 13])), 'A\tB\nC');
});

test('HWPX: 구역 순서대로 문단 추출', async () => {
  const text = await extractHwpxText(await load('sample.hwpx'));
  assert.equal(text, '서론\n금리는 경제의 체온계 & 신호\t(김철수, 2021)\n결론\n정책의 일관성이 필요하다\t(김철수, 2021)');
});

test('확장자별로 알맞은 읽기 방법 선택', async () => {
  const file = (name, buf) => ({ name, arrayBuffer: async () => buf, text: async () => new TextDecoder().decode(buf) });
  assert.match(await readAssignmentFile(file('과제.hwp', await load('sample.hwp'))), /^서론\n/);
  assert.match(await readAssignmentFile(file('과제.HWPX', await load('sample.hwpx'))), /^서론\n/);
  await assert.rejects(readAssignmentFile(file('과제.doc', new ArrayBuffer(4))), /\.docx로 저장/);
});
