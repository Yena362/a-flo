"""테스트용 .hwp / .hwpx 파일 만들기 (python3 tests/fixtures/make_hwp.py)

한컴 '한글 문서 파일 형식 5.0' 구조를 그대로 따른 최소 파일을 만든다.
 - 복합 파일(CFB v3, 512바이트 섹터) + 미니 스트림(4096바이트 미만 스트림)
 - FileHeader(압축 플래그), BodyText/Section0(작은 문단), BodyText/Section1(4096바이트 넘는 긴 문단)
 - 문단 글자 레코드(태그 67)에 탭·인라인 제어 문자·문단 끝 포함
"""
import struct, zlib, zipfile, os

HERE = os.path.dirname(os.path.abspath(__file__))
FREE, END, FATSECT = 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFD


def record(tag, payload, level=0):
    size = len(payload)
    if size >= 0xFFF:
        return struct.pack('<I', tag | (level << 10) | (0xFFF << 20)) + struct.pack('<I', size) + payload
    return struct.pack('<I', tag | (level << 10) | (size << 20)) + payload


def para_text(text):
    out = b''
    for ch in text:
        if ch == '\t':  # 탭: 확장 제어 문자 8글자(16바이트)
            out += struct.pack('<H', 9) + b'\x00' * 14
        else:
            out += ch.encode('utf-16-le')
    return out + struct.pack('<H', 13)  # 문단 끝


def section(paras, with_ctrl=False):
    data = b''
    for i, t in enumerate(paras):
        data += record(66, b'\x00' * 22)  # PARA_HEADER (건너뛰어야 함)
        payload = para_text(t)
        if with_ctrl and i == 0:  # 맨 앞에 구역 정의 같은 확장 제어 문자(코드 2) 하나
            payload = struct.pack('<H', 2) + b'secd' + b'\x00' * 10 + payload
        data += record(67, payload)
        data += record(68, b'\x00' * 8)  # PARA_CHAR_SHAPE (건너뛰어야 함)
    return data


def deflate_raw(b):
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return c.compress(b) + c.flush()


def build_cfb(streams):
    """streams: [(path tuple, bytes)] — 저장소는 경로로 자동 생성"""
    names = []  # (name, type, parent_idx, data)
    names.append(('Root Entry', 5, None, None))
    index = {(): 0}
    for path, data in streams:
        for depth in range(1, len(path)):
            key = path[:depth]
            if key not in index:
                index[key] = len(names)
                names.append((path[depth - 1], 1, index[path[:depth - 1]], None))
        index[path] = len(names)
        names.append((path[-1], 2, index[path[:-1]], data))

    # 자식 연결: 부모의 child = 첫 자식, 형제는 right로
    kids = {}
    for i, (_, _, parent, _) in enumerate(names):
        if parent is not None:
            kids.setdefault(parent, []).append(i)
    child = {p: ks[0] for p, ks in kids.items()}
    right = {}
    for ks in kids.values():
        for a, b in zip(ks, ks[1:]):
            right[a] = b

    mini, regular = [], []
    for i, (_, t, _, data) in enumerate(names):
        if t == 2:
            (mini if len(data) < 4096 else regular).append(i)

    # 미니 스트림 배치
    mini_buf, mini_fat, mini_start = b'', [], {}
    for i in mini:
        data = names[i][3]
        n = (len(data) + 63) // 64
        first = len(mini_fat)
        mini_start[i] = first
        mini_fat += [first + k + 1 for k in range(n - 1)] + [END]
        mini_buf += data + b'\x00' * (n * 64 - len(data))

    sectors = []  # 섹터 내용
    fat = []

    def alloc(blob):
        n = max(1, (len(blob) + 511) // 512)
        start = len(sectors)
        for k in range(n):
            sectors.append(blob[k * 512:(k + 1) * 512].ljust(512, b'\x00'))
            fat.append(start + k + 1 if k < n - 1 else END)
        return start

    sectors.append(b''); fat.append(FATSECT)  # 0번: FAT 자리
    dir_count = (len(names) + 3) // 4
    dir_start = len(sectors)
    for k in range(dir_count):
        sectors.append(b''); fat.append(dir_start + k + 1 if k < dir_count - 1 else END)
    minifat_start = alloc(b''.join(struct.pack('<I', x) for x in mini_fat).ljust(512, b'\xff'))
    ministream_start = alloc(mini_buf) if mini_buf else END
    reg_start = {i: alloc(names[i][3]) for i in regular}

    def entry(i):
        name, t, _, data = names[i]
        enc = (name + '\x00').encode('utf-16-le')
        start, size = END, 0
        if t == 5:
            start, size = ministream_start, len(mini_buf)
        elif t == 2:
            size = len(data)
            start = mini_start[i] if i in mini_start else reg_start[i]
        return (enc.ljust(64, b'\x00') + struct.pack('<HBB', len(enc), t, 1)
                + struct.pack('<III', FREE, right.get(i, FREE), child.get(i, FREE))
                + b'\x00' * 16 + b'\x00' * 4 + b'\x00' * 16 + struct.pack('<III', start, size, 0))

    dir_blob = b''.join(entry(i) for i in range(len(names)))
    empty = (b'\x00' * 64 + struct.pack('<HBB', 0, 0, 0) + struct.pack('<III', FREE, FREE, FREE) + b'\x00' * 36 + struct.pack('<III', 0, 0, 0))
    dir_blob = dir_blob.ljust(dir_count * 512, b'\x00')
    for k in range(len(names), dir_count * 4):
        dir_blob = dir_blob[:k * 128] + empty + dir_blob[(k + 1) * 128:]
    for k in range(dir_count):
        sectors[dir_start + k] = dir_blob[k * 512:(k + 1) * 512]

    assert len(fat) <= 128
    sectors[0] = b''.join(struct.pack('<I', x) for x in fat).ljust(512, b'\xff')

    header = bytearray(512)
    header[0:8] = bytes([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
    struct.pack_into('<HHHHH', header, 0x18, 0x3E, 3, 0xFFFE, 9, 6)
    struct.pack_into('<I', header, 0x2C, 1)
    struct.pack_into('<I', header, 0x30, dir_start)
    struct.pack_into('<I', header, 0x38, 4096)
    struct.pack_into('<II', header, 0x3C, minifat_start, 1)
    struct.pack_into('<II', header, 0x44, END, 0)
    struct.pack_into('<I', header, 0x4C, 0)
    for k in range(1, 109):
        struct.pack_into('<I', header, 0x4C + k * 4, FREE)
    return bytes(header) + b''.join(sectors)


def file_header(props):
    return b'HWP Document File'.ljust(32, b'\x00') + struct.pack('<II', 0x05010100, props) + b'\x00' * 216


def _noise(n, seed=7):
    # 압축이 잘 안 되는 한글 음절 나열 → 압축 후에도 4096바이트가 넘는 큰 스트림을 만들기 위함
    out, x = [], seed
    for i in range(n):
        x = (x * 1103515245 + 12345) & 0x7FFFFFFF
        out.append(chr(0xAC00 + x % 11172))
        if i % 7 == 6:
            out.append(' ')
    return ''.join(out)

LONG = '본론 금리가 오르면 ' + _noise(3000)  # 4096바이트가 넘는 문단

def make_hwp(path, props=1):
    s0 = section(['서론', '최근 금리 인상이 가계에 미치는 영향은 크다.\t(한국은행, 2024)'], with_ctrl=True)
    s1 = section([LONG.strip(), '결론'])
    if props & 1:
        s0, s1 = deflate_raw(s0), deflate_raw(s1)
    data = build_cfb([
        (('FileHeader',), file_header(props)),
        (('DocInfo',), deflate_raw(b'\x00' * 40)),
        (('BodyText', 'Section0'), s0),
        (('BodyText', 'Section1'), s1),
    ])
    open(path, 'wb').write(data)


def make_hwpx(path):
    sec = ('<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" '
           'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">'
           '<hp:p><hp:run><hp:t>서론</hp:t></hp:run></hp:p>'
           '<hp:p><hp:run><hp:t>금리는 경제의 체온계 &amp; 신호</hp:t><hp:t><hp:tab/>(김철수, 2021)</hp:t></hp:run></hp:p></hs:sec>')
    sec1 = sec.replace('서론', '결론').replace('금리는 경제의 체온계 &amp; 신호', '정책의 일관성이 필요하다')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('mimetype', 'application/hwp+zip', compress_type=zipfile.ZIP_STORED)
        z.writestr('Contents/section1.xml', sec1)
        z.writestr('Contents/section0.xml', sec)
        z.writestr('Contents/header.xml', '<head/>')


if __name__ == '__main__':
    make_hwp(os.path.join(HERE, 'sample.hwp'))
    make_hwp(os.path.join(HERE, 'locked.hwp'), props=1 | 2)
    make_hwpx(os.path.join(HERE, 'sample.hwpx'))
    print('ok')
