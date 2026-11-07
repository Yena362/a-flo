// 과제 파일에서 본문 텍스트 뽑기
//   DOCX, HWPX : zip 안의 XML (라이브러리 없이, 브라우저 내장 압축 해제 사용)
//   HWP        : js/hwp.js (복합 파일 + 레코드 직접 해석)
//   PDF        : Mozilla pdf.js를 필요할 때만 CDN에서 불러옴 (글자가 들어 있는 PDF만, 스캔 이미지는 불가)
//   PPTX       : zip 안의 슬라이드 XML + 발표자 노트
//   TXT, MD    : 그대로
import { extractHwpText } from './hwp.js';

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205';

// ---------- zip ----------
// 압축 풀기: 끝부분이 잘렸거나 뒤에 군더더기가 붙은 스트림도 읽은 데까지는 살린다
// (한컴 프로그램이 만든 일부 파일은 브라우저 기본 압축 해제기가 "데이터가 불완전"하다며 통째로 거부함)
async function inflateRaw(data) {
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } catch (e) {
    if (!total) throw e;
  }
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

// zip 안에서 이름이 조건에 맞는 파일들을 { 이름: 글자 } 로 돌려준다
export async function readZipTexts(arrayBuffer, wanted) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('파일 형식이 올바르지 않아요.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = {};
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const csize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (wanted(name)) {
      const start = localOff + 30 + view.getUint16(localOff + 26, true) + view.getUint16(localOff + 28, true);
      const data = bytes.subarray(start, start + csize);
      out[name] = dec.decode(method === 0 ? data : await inflateRaw(data));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodeEntities = s => s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e]).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
const tidy = s => s.replace(/\n{3,}/g, '\n\n').trim();

// ---------- DOCX ----------
export function docXmlToText(xml) {
  const token = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br[^>]*\/>/g;
  return tidy(xml
    .split(/<\/w:p>/)
    .map(p => {
      let s = '', m;
      while ((m = token.exec(p))) s += m[1] !== undefined ? m[1] : m[0].startsWith('<w:tab') ? '\t' : '\n';
      return decodeEntities(s);
    })
    .join('\n'));
}

export async function extractDocxText(arrayBuffer) {
  const files = await readZipTexts(arrayBuffer, n => n === 'word/document.xml');
  if (!files['word/document.xml']) throw new Error('워드 문서 본문을 찾지 못했어요.');
  return docXmlToText(files['word/document.xml']);
}

// ---------- HWPX (한글 2014 이후 기본 형식 중 하나, OWPML) ----------
export function hwpxSectionToText(xml) {
  return xml
    .split(/<\/hp:p>/)
    .slice(0, -1) // 마지막 문단 뒤에 남는 꼬리 부분은 문단이 아님
    .map(p => {
      let s = '';
      const re = /<hp:t(?:\s[^>]*)?>([\s\S]*?)<\/hp:t>/g;
      let m;
      while ((m = re.exec(p))) {
        s += m[1]
          .replace(/<hp:tab[^>]*\/?>/g, '\t')
          .replace(/<hp:lineBreak[^>]*\/?>/g, '\n')
          .replace(/<hp:(?:nbSpace|fwSpace)[^>]*\/?>/g, ' ')
          .replace(/<[^>]+>/g, '');
      }
      return decodeEntities(s);
    })
    .join('\n');
}

export async function extractHwpxText(arrayBuffer) {
  const files = await readZipTexts(arrayBuffer, n => /^Contents\/section\d+\.xml$/i.test(n));
  const names = Object.keys(files).sort((a, b) => Number(a.match(/(\d+)\.xml$/i)[1]) - Number(b.match(/(\d+)\.xml$/i)[1]));
  if (!names.length) throw new Error('한글(HWPX) 문서 본문을 찾지 못했어요.');
  return tidy(names.map(n => hwpxSectionToText(files[n])).join('\n'));
}

// ---------- PPTX (파워포인트 강의자료) ----------
// 슬라이드 글자 + 발표자 노트를 슬라이드 순서대로 뽑는다
export function pptxSlideToText(xml) {
  return xml
    .split(/<\/a:p>/)
    .map(p => {
      let s = '';
      const re = /<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>|<a:br[^>]*\/>/g;
      let m;
      while ((m = re.exec(p))) s += m[1] !== undefined ? m[1] : '\n';
      return decodeEntities(s).trim();
    })
    .filter(Boolean)
    .join('\n');
}

export async function extractPptxText(arrayBuffer) {
  const files = await readZipTexts(arrayBuffer, n => /^ppt\/(slides\/slide\d+\.xml|slides\/_rels\/slide\d+\.xml\.rels|notesSlides\/notesSlide\d+\.xml)$/.test(n));
  const num = n => Number(n.match(/(\d+)\.xml/)[1]);
  const slides = Object.keys(files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b));
  if (!slides.length) throw new Error('파워포인트 슬라이드를 찾지 못했어요.');
  const out = slides.map((n, i) => {
    const rels = files[`ppt/slides/_rels/${n.split('/').pop()}.rels`] || '';
    const note = rels.match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/);
    const body = pptxSlideToText(files[n]);
    // 노트에 들어 있는 슬라이드 번호 칸(숫자, <number>, ‹#›)은 뺀다
    const notes = note && files[`ppt/notesSlides/${note[1]}`] ? pptxSlideToText(files[`ppt/notesSlides/${note[1]}`]).split('\n').filter(l => !/^(\d+|<number>|‹#›)$/.test(l.trim())).join('\n') : '';
    return `[슬라이드 ${i + 1}]\n${body}${notes ? `\n(발표자 노트) ${notes}` : ''}`;
  });
  return tidy(out.join('\n\n'));
}

// ---------- PDF (pdf.js) ----------
export async function extractPdfText(arrayBuffer, onProgress = () => {}) {
  let pdfjs;
  try {
    pdfjs = await import(/* @vite-ignore */ `${PDFJS}/build/pdf.min.mjs`);
    pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}/build/pdf.worker.min.mjs`;
  } catch {
    throw new Error('PDF 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인하거나 내용을 붙여 넣어 주세요.');
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), cMapUrl: `${PDFJS}/cmaps/`, cMapPacked: true, standardFontDataUrl: `${PDFJS}/standard_fonts/` }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress(`PDF ${i} / ${doc.numPages}쪽 읽는 중…`);
    const page = await doc.getPage(i);
    const { items } = await page.getTextContent();
    let s = '';
    for (const it of items) {
      if (!('str' in it)) continue;
      s += it.str;
      if (it.hasEOL) s += '\n';
    }
    pages.push(s);
  }
  const text = tidy(pages.join('\n\n'));
  if (text.replace(/\s/g, '').length < 20) throw new Error('글자를 찾지 못했어요. 스캔한 이미지 PDF는 읽을 수 없어요. 원본 파일이나 텍스트를 올려 주세요.');
  return text;
}

// ---------- 확장자별 ----------
export async function readAssignmentFile(file, onProgress = () => {}) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'txt' || ext === 'md') return file.text();
  if (ext === 'docx') return extractDocxText(await file.arrayBuffer());
  if (ext === 'hwpx') return extractHwpxText(await file.arrayBuffer());
  if (ext === 'hwp') return extractHwpText(await file.arrayBuffer());
  if (ext === 'pptx') return extractPptxText(await file.arrayBuffer());
  if (ext === 'ppt') throw new Error('예전 파워포인트(.ppt) 파일은 읽을 수 없어요. .pptx로 저장하거나 PDF로 내보내 주세요.');
  if (ext === 'pdf') { onProgress('PDF 읽기 도구를 불러오는 중…'); return extractPdfText(await file.arrayBuffer(), onProgress); }
  if (ext === 'doc') throw new Error('예전 워드(.doc) 파일은 읽을 수 없어요. .docx로 저장해 주세요.');
  throw new Error('HWP · HWPX · DOCX · PPTX · PDF · TXT 파일을 올려 주세요.');
}
