// 한글(.hwp, HWP 5.x) 파일에서 본문 텍스트 뽑기 — 라이브러리 없이 동작
//
// .hwp 구조 (한컴 공개 문서 "한글 문서 파일 형식 5.0" 기준)
//   - 파일 전체는 MS "복합 파일(OLE/CFB)" 컨테이너
//   - FileHeader 스트림: 서명 + 압축/암호/배포용 여부
//   - BodyText/Section0, Section1 … 스트림: 본문 (압축 시 raw deflate)
//   - 스트림 안은 "레코드"의 연속. 태그 67(HWPTAG_PARA_TEXT)에 문단 글자(UTF-16LE)가 들어 있음

const ENDOFCHAIN = 0xFFFFFFFE;
const FREESECT = 0xFFFFFFFF;
const HWPTAG_PARA_TEXT = 0x10 + 51; // 67

export class HwpError extends Error {}

// ---------- 복합 파일(CFB) 읽기 ----------
export function readCfb(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const sig = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
  if (u8.length < 512 || !sig.every((b, i) => u8[i] === b)) throw new HwpError('한글(HWP) 파일 형식이 아니에요.');

  const sectorSize = 1 << dv.getUint16(0x1E, true);
  const miniSectorSize = 1 << dv.getUint16(0x20, true);
  const numFatSectors = dv.getUint32(0x2C, true);
  const firstDirSector = dv.getUint32(0x30, true);
  const miniCutoff = dv.getUint32(0x38, true);
  const firstMiniFat = dv.getUint32(0x3C, true);
  const firstDifat = dv.getUint32(0x44, true);
  const numDifat = dv.getUint32(0x48, true);
  const sectorOffset = n => (n + 1) * sectorSize;
  const u32 = off => (off + 4 <= u8.length ? dv.getUint32(off, true) : FREESECT);

  // FAT 섹터 목록(DIFAT)
  const fatSectors = [];
  for (let i = 0; i < 109 && fatSectors.length < numFatSectors; i++) {
    const s = dv.getUint32(0x4C + i * 4, true);
    if (s !== FREESECT) fatSectors.push(s);
  }
  let d = firstDifat;
  for (let k = 0; k < numDifat && d !== ENDOFCHAIN && d !== FREESECT; k++) {
    const per = sectorSize / 4 - 1;
    for (let i = 0; i < per && fatSectors.length < numFatSectors; i++) {
      const s = u32(sectorOffset(d) + i * 4);
      if (s !== FREESECT) fatSectors.push(s);
    }
    d = u32(sectorOffset(d) + per * 4);
  }
  const fat = [];
  for (const s of fatSectors) for (let i = 0; i < sectorSize / 4; i++) fat.push(u32(sectorOffset(s) + i * 4));

  const chain = (start, table) => {
    const out = [];
    const seen = new Set();
    for (let s = start; s !== ENDOFCHAIN && s !== FREESECT && s < table.length; s = table[s]) {
      if (seen.has(s)) throw new HwpError('파일이 손상된 것 같아요.');
      seen.add(s);
      out.push(s);
    }
    return out;
  };
  const readRegular = (start, size) => {
    const out = new Uint8Array(size);
    let p = 0;
    for (const s of chain(start, fat)) {
      if (p >= size) break;
      const n = Math.min(sectorSize, size - p);
      out.set(u8.subarray(sectorOffset(s), sectorOffset(s) + n), p);
      p += n;
    }
    return out.subarray(0, p);
  };

  // 디렉터리
  const dirSectors = chain(firstDirSector, fat);
  const entries = [];
  for (const s of dirSectors) {
    for (let i = 0; i < sectorSize / 128; i++) {
      const o = sectorOffset(s) + i * 128;
      if (o + 128 > u8.length) break;
      const nameLen = dv.getUint16(o + 64, true);
      let name = '';
      for (let j = 0; j < Math.max(0, nameLen / 2 - 1); j++) name += String.fromCharCode(dv.getUint16(o + j * 2, true));
      entries.push({
        name,
        type: u8[o + 66], // 1 저장소, 2 스트림, 5 루트
        left: dv.getUint32(o + 68, true),
        right: dv.getUint32(o + 72, true),
        child: dv.getUint32(o + 76, true),
        start: dv.getUint32(o + 116, true),
        size: dv.getUint32(o + 120, true),
      });
    }
  }
  const root = entries[0];
  if (!root || root.type !== 5) throw new HwpError('파일이 손상된 것 같아요.');

  // 작은 스트림은 미니 스트림 안에 있음
  const miniStream = root.start === ENDOFCHAIN ? new Uint8Array(0) : readRegular(root.start, root.size);
  const miniFat = [];
  for (const s of chain(firstMiniFat, fat)) for (let i = 0; i < sectorSize / 4; i++) miniFat.push(u32(sectorOffset(s) + i * 4));
  const readMini = (start, size) => {
    const out = new Uint8Array(size);
    let p = 0;
    for (const s of chain(start, miniFat)) {
      if (p >= size) break;
      const n = Math.min(miniSectorSize, size - p);
      out.set(miniStream.subarray(s * miniSectorSize, s * miniSectorSize + n), p);
      p += n;
    }
    return out.subarray(0, p);
  };

  const children = idx => {
    const out = [];
    const seen = new Set();
    const walk = i => {
      if (i === FREESECT || i >= entries.length || seen.has(i)) return;
      seen.add(i);
      const e = entries[i];
      walk(e.left);
      out.push(e);
      walk(e.right);
    };
    walk(entries[idx].child);
    return out;
  };

  return {
    list(path = []) {
      let idx = 0;
      for (const part of path) {
        const next = children(idx).find(e => e.name.toLowerCase() === part.toLowerCase());
        if (!next) return [];
        idx = entries.indexOf(next);
      }
      return children(idx).map(e => ({ name: e.name, type: e.type === 1 ? 'storage' : 'stream' }));
    },
    read(path) {
      let idx = 0;
      for (const part of path) {
        const next = children(idx).find(e => e.name.toLowerCase() === part.toLowerCase());
        if (!next) return null;
        idx = entries.indexOf(next);
      }
      const e = entries[idx];
      if (e.type !== 2) return null;
      return e.size < miniCutoff ? readMini(e.start, e.size) : readRegular(e.start, e.size);
    },
  };
}

// ---------- HWP 레코드 → 문단 텍스트 ----------
// 글자 코드 1~31 중 일부는 "제어 문자"이고, 대부분 8글자(16바이트) 길이를 차지함
const ONE_CHAR_CONTROLS = new Set([0, 10, 13, 24, 25, 26, 27, 28, 29, 30, 31]);

export function paraTextToString(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let out = '';
  for (let i = 0; i + 1 < bytes.length;) {
    const c = dv.getUint16(i, true);
    if (c < 32) {
      if (c === 9) out += '\t';
      else if (c === 10) out += '\n';
      else if (c === 24 || c === 30 || c === 31) out += c === 24 ? '-' : ' '; // 하이픈, 묶음 빈칸, 고정폭 빈칸
      i += ONE_CHAR_CONTROLS.has(c) ? 2 : 16;
      continue;
    }
    out += String.fromCharCode(c);
    i += 2;
  }
  return out;
}

export function recordsToText(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const paras = [];
  for (let p = 0; p + 4 <= bytes.length;) {
    const h = dv.getUint32(p, true);
    const tag = h & 0x3FF;
    let size = (h >>> 20) & 0xFFF;
    p += 4;
    if (size === 0xFFF) { size = dv.getUint32(p, true); p += 4; }
    if (tag === HWPTAG_PARA_TEXT) paras.push(paraTextToString(bytes.subarray(p, p + size)));
    p += size;
  }
  return paras;
}

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

export async function extractHwpText(arrayBuffer) {
  const cfb = readCfb(new Uint8Array(arrayBuffer));
  const header = cfb.read(['FileHeader']);
  if (!header || !new TextDecoder().decode(header.subarray(0, 17)).startsWith('HWP Document File')) {
    throw new HwpError('한글(HWP 5.0 이상) 파일이 아니에요. 오래된 한글 97 파일은 새 버전으로 저장해 주세요.');
  }
  const props = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(36, true);
  const compressed = (props & 1) !== 0;
  if (props & 2) throw new HwpError('암호가 걸린 한글 파일이에요. 암호를 풀고 다시 저장해 주세요.');
  if (props & 4) throw new HwpError('배포용(복사 방지) 한글 파일은 읽을 수 없어요. 일반 문서로 저장해 주세요.');

  const sections = cfb.list(['BodyText'])
    .filter(e => e.type === 'stream' && /^Section\d+$/i.test(e.name))
    .sort((a, b) => Number(a.name.slice(7)) - Number(b.name.slice(7)));
  if (!sections.length) throw new HwpError('한글 파일에서 본문을 찾지 못했어요.');

  const paras = [];
  for (const s of sections) {
    let data = cfb.read(['BodyText', s.name]);
    if (compressed) data = await inflateRaw(data);
    paras.push(...recordsToText(data));
  }
  return paras.map(t => t.replace(/[ \t]+$/g, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
