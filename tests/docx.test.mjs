import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractDocxText } from '../js/docx.js';

test('docx 본문 텍스트 추출', async () => {
  const buf = await readFile(new URL('./fixtures/sample.docx', import.meta.url));
  const text = await extractDocxText(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  assert.equal(text, '서론\n금리는 경제의 체온계 & 신호\n참고문헌');
});
