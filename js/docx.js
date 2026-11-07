// 라이브러리 없이 .docx에서 본문 텍스트를 뽑는다.
// docx는 zip 파일이고, 본문은 word/document.xml에 있다. 압축은 브라우저 내장 DecompressionStream으로 푼다.

export async function extractDocxText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('docx 파일 형식이 아니에요.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const csize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === 'word/document.xml') {
      const lName = view.getUint16(localOff + 26, true);
      const lExtra = view.getUint16(localOff + 28, true);
      const start = localOff + 30 + lName + lExtra;
      const data = bytes.subarray(start, start + csize);
      const xml = method === 0 ? data : await inflateRaw(data);
      return docXmlToText(dec.decode(xml));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('문서 본문을 찾지 못했어요.');
}

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function docXmlToText(xml) {
  const token = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g;
  return xml
    .split(/<\/w:p>/)
    .map(p => {
      let s = '', m;
      while ((m = token.exec(p))) s += m[1] !== undefined ? m[1] : m[0].startsWith('<w:tab') ? '\t' : '\n';
      return s;
    })
    .map(s => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e]).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 파일 종류별로 텍스트를 읽는다. PDF·HWP는 아직 미지원 (다음 단계 과제)
export async function readAssignmentFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'txt' || ext === 'md') return file.text();
  if (ext === 'docx') return extractDocxText(await file.arrayBuffer());
  if (ext === 'pdf' || ext === 'hwp' || ext === 'hwpx') {
    throw new Error(`${ext.toUpperCase()} 읽기는 준비 중이에요. 지금은 내용을 복사해서 붙여 넣어 주세요.`);
  }
  throw new Error('DOCX, TXT 파일을 올려 주세요.');
}
