// 마스코트 4종 (삐약이·학점이·불씨·에이) × 표정/성장 단계
// 디자인팀 PNG가 assets/mascot/<캐릭터>/<표정>.png 에 있으면 그 이미지를 쓰고,
// 없으면 아래 벡터(SVG) 임시 그림을 보여준다. 파일 이름 규칙은 MOODS 참고.

export const CHARACTERS = {
  chick: { name: '삐약이', desc: '점수와 함께 자라는 병아리' },
  owl: { name: '학점이', desc: '밤샘 올빼미 조교' },
  flame: { name: '불씨', desc: '연속 학습 불꽃 정령' },
  a: { name: '에이', desc: '로고 A 그 자체' },
};

// 파일 이름 = 키 (예: assets/mascot/chick/quiz.png)
export const MOODS = {
  default: '기본', quiz: '퀴즈 출제', analyzing: '분석 중', danger: '위험 발견',
  cheer: 'A+ 환호', sad: '불꽃 끊김', lv1: 'Lv.1', lv2: 'Lv.2', lv3: 'Lv.3',
};

const P = {
  chick: { ey: 100, dx: 24, er: 17, pr: 9, mouth: 'beak', bc: '#FF8A1F', bw: 22, my: 118, top: 52, dark: '#2B2118', cheek: [56, 144, 124], cheekC: '#FF8FA0' },
  owl: { ey: 92, dx: 24, er: 22, pr: 10, mouth: 'beak', bc: '#FFB547', bw: 16, my: 114, top: 40, dark: '#1E1A3A', glasses: true, cheek: [50, 150, 118], cheekC: '#FF9EC4', capeC: '#26324F' },
  flame: { ey: 130, dx: 14, er: 0, pr: 0, mouth: 'line', my: 148, top: 78, dark: '#2E1A12', cheek: [74, 126, 146], cheekC: '#FF6B6B' },
  a: { ey: 118, dx: 16, er: 13, pr: 7, mouth: 'line', my: 142, top: 44, dark: '#2B1A16', cheek: [68, 132, 138], cheekC: '#FFC2B0' },
};
const APATH = 'M100 22 C112 22 118 30 124 44 L168 150 C174 168 164 182 148 182 L52 182 C36 182 26 168 32 150 L76 44 C82 30 88 22 100 22Z';
const ATOP = 'M100 22 C112 22 118 30 124 44 L140 82 L60 82 L76 44 C82 30 88 22 100 22Z';
const SH = (rx, cy) => `<ellipse cx="100" cy="${cy}" rx="${rx}" ry="7" fill="#000" fill-opacity=".08"/>`;

function body(key, lvl) {
  if (key === 'chick') return SH(54, 186) + '<path d="M84 168 v14 M116 168 v14" stroke="#FF8A1F" stroke-width="7" stroke-linecap="round" fill="none"/><circle cx="94" cy="50" r="10" fill="#FFD43B"/><circle cx="108" cy="46" r="8" fill="#FFD43B"/><ellipse cx="38" cy="118" rx="15" ry="26" fill="#F5BE00" transform="rotate(25 38 118)"/><ellipse cx="162" cy="118" rx="15" ry="26" fill="#F5BE00" transform="rotate(-25 162 118)"/><ellipse cx="100" cy="112" rx="64" ry="62" fill="#FFD43B"/><ellipse cx="100" cy="136" rx="42" ry="34" fill="#FFE680"/>';
  if (key === 'owl') return SH(54, 188) + '<path d="M84 172 v12 M116 172 v12" stroke="#FFB547" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M50 58 L44 24 L76 44Z" fill="#6A4FF0"/><path d="M150 58 L156 24 L124 44Z" fill="#6A4FF0"/><path d="M40 92 q0 -56 60 -56 q60 0 60 56 v40 q0 46 -60 46 q-60 0 -60 -46z" fill="#7B61FF"/><ellipse cx="100" cy="142" rx="40" ry="30" fill="#BBAEFF"/><path d="M40 110 q-14 20 2 44 q10 -20 8 -40z" fill="#5B42E0"/><path d="M160 110 q14 20 -2 44 q-10 -20 -8 -40z" fill="#5B42E0"/>';
  if (key === 'flame') {
    if (lvl === 3) return SH(56, 192) + '<path d="M100 2 C122 44 176 64 176 124 C176 166 142 192 100 192 C58 192 24 166 24 124 C24 88 48 72 62 46 C66 70 78 80 88 82 C84 54 90 28 100 2Z" fill="#FF4A1A"/><path d="M100 74 C114 98 140 110 140 138 C140 162 122 178 100 178 C78 178 60 162 60 138 C60 116 78 106 84 94 C88 106 94 108 100 108 C97 96 97 86 100 74Z" fill="#FFD23A"/>';
    const o = lvl === 1 ? '#FF8A5C' : '#FF5A1F', i = lvl === 1 ? '#FFC97A' : '#FFB03A';
    return SH(50, 190) + `<path d="M100 14 C118 48 160 68 160 122 C160 160 133 184 100 184 C67 184 40 160 40 122 C40 92 58 78 70 56 C74 76 82 84 90 86 C86 62 92 38 100 14Z" fill="${o}"/><path d="M100 74 C114 98 138 110 138 136 C138 160 120 174 100 174 C80 174 62 160 62 136 C62 116 78 106 84 94 C88 106 94 108 100 108 C97 96 97 86 100 74Z" fill="${i}"/>`;
  }
  if (lvl === 1) return SH(60, 190) + `<path d="M40 160 q-14 -10 -10 -26" stroke="#BDB2AA" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M160 160 q16 -6 18 -26" stroke="#BDB2AA" stroke-width="5" fill="none" stroke-linecap="round"/><path d="${APATH}" fill="#FFFFFF" stroke="#2B1A16" stroke-width="4" stroke-dasharray="10 7"/>`;
  const c1 = lvl === 3 ? '#FFB000' : '#F2583A', c2 = lvl === 3 ? '#FFD95A' : '#FFC23D';
  return SH(60, 190) + `<path d="M40 160 q-14 -10 -10 -26" stroke="${c1}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M160 160 q16 -6 18 -26" stroke="${c1}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="${APATH}" fill="${c1}"/><path d="${ATOP}" fill="${c2}"/>`;
}

function eyes(p, kind) {
  const L = 100 - p.dx, R = 100 + p.dx, y = p.ey, d = p.dark, er = p.er || 10;
  const op = (x, ox, oy) => p.er
    ? `<circle cx="${x}" cy="${y}" r="${p.er}" fill="#fff"/><circle cx="${x + ox}" cy="${y + oy}" r="${p.pr}" fill="${d}"/><circle cx="${x + ox + p.pr * 0.35}" cy="${y + oy - p.pr * 0.4}" r="${Math.max(2, p.pr * 0.32)}" fill="#fff"/>`
    : `<ellipse cx="${x + ox / 2}" cy="${y + oy / 2}" rx="7" ry="10" fill="${d}"/><circle cx="${x + ox / 2 + 2}" cy="${y + oy / 2 - 4}" r="2.5" fill="#fff"/>`;
  const arc = x => `<path d="M${x - 11} ${y + 4} q11 -15 22 0" stroke="${d}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  const dot = x => p.er ? `<circle cx="${x}" cy="${y}" r="${p.er}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${Math.max(4, p.pr * 0.45)}" fill="${d}"/>` : `<circle cx="${x}" cy="${y}" r="5" fill="${d}"/>`;
  if (kind === 'wink') return op(L, 2, 2) + arc(R);
  if (kind === 'happy') return arc(L) + arc(R);
  if (kind === 'look') return op(L, 4, -4) + op(R, 4, -4);
  if (kind === 'dot') return dot(L) + dot(R);
  if (kind === 'sad') return op(L, 0, 3) + op(R, 0, 3) + `<path d="M${L - 12} ${y - er - 4} L${L + 10} ${y - er - 11}" stroke="${d}" stroke-width="5" stroke-linecap="round"/><path d="M${R + 12} ${y - er - 4} L${R - 10} ${y - er - 11}" stroke="${d}" stroke-width="5" stroke-linecap="round"/><path d="M${L - 6} ${y + er + 2} q7 11 0 15 q-7 -4 0 -15z" fill="#5AB4FF"/>`;
  return op(L, 2, 2) + op(R, 2, 2);
}

function glasses(p) {
  const L = 100 - p.dx, R = 100 + p.dx, r = p.er + 3, s = `stroke="${p.dark}" stroke-width="4.5"`;
  return `<circle cx="${L}" cy="${p.ey}" r="${r}" fill="none" ${s}/><circle cx="${R}" cy="${p.ey}" r="${r}" fill="none" ${s}/><path d="M${L + r} ${p.ey} H${R - r}" ${s}/>`;
}

function mouth(p, kind) {
  const y = p.my;
  if (p.mouth === 'beak') {
    const w = p.bw, x0 = 100 - w / 2, c = p.bc;
    if (kind === 'open') return `<path d="M${x0} ${y} h${w} q-2 20 ${-w / 2} 20 q${-(w / 2 - 2)} 0 ${-w / 2} -20z" fill="${c}"/>`;
    if (kind === 'wavy') return `<path d="M${x0 - 2} ${y + 6} q${w / 4 + 0.5} -7 ${w / 2 + 1} 0 q${w / 4 + 0.5} 7 ${w / 2 + 1} 0" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    return `<path d="M${x0} ${y} h${w} l${-w / 2} 13z" fill="${c}" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  const d = p.dark, s = `stroke="${d}" stroke-width="5" fill="none" stroke-linecap="round"`;
  if (kind === 'open') return `<path d="M88 ${y - 2} h24 q-3 16 -12 16 q-9 0 -12 -16z" fill="${d}"/>`;
  if (kind === 'wavy') return `<path d="M86 ${y + 2} q7 -6 14 0 q7 6 14 0" ${s}/>`;
  if (kind === 'frown') return `<path d="M92 ${y + 6} q8 -8 16 0" ${s}/>`;
  return `<path d="M92 ${y} q8 8 16 0" ${s}/>`;
}

const star = (cx, cy, r) => `<path d="M${cx} ${cy - r} L${cx + r * .3} ${cy - r * .3} L${cx + r} ${cy} L${cx + r * .3} ${cy + r * .3} L${cx} ${cy + r} L${cx - r * .3} ${cy + r * .3} L${cx - r} ${cy} L${cx - r * .3} ${cy - r * .3}Z" fill="#FFC83A"/>`;

function prop(p, n) {
  const t = p.top;
  return ({
    pencil: '<g transform="rotate(28 160 128)"><rect x="153" y="92" width="14" height="58" rx="3" fill="#FFC83A"/><rect x="153" y="86" width="14" height="9" rx="2" fill="#FF8FA0"/><path d="M153 150 h14 l-7 15z" fill="#F4D3A6"/><path d="M157.5 159.5 h5 l-2.5 5.5z" fill="#2B2118"/></g>',
    magnifier: '<path d="M138 152 L116 176" stroke="#26324F" stroke-width="10" stroke-linecap="round"/><circle cx="152" cy="136" r="21" fill="#DFF1FF" fill-opacity=".85" stroke="#26324F" stroke-width="7"/><path d="M142 128 q6 -8 14 -6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>',
    dots: '<circle cx="146" cy="36" r="5" fill="#9C93B5"/><circle cx="162" cy="25" r="6.5" fill="#9C93B5"/><circle cx="181" cy="13" r="8" fill="#9C93B5"/>',
    sweat: '<path d="M160 44 q13 19 0 26 q-13 -7 0 -26z" fill="#5AB4FF"/><path d="M180 72 q8 12 0 16 q-8 -4 0 -16z" fill="#5AB4FF"/>',
    cap: `<path d="M76 ${t + 6} v12 q24 10 48 0 v-12" fill="#1B2440"/><path d="M58 ${t} L100 ${t - 17} L142 ${t} L100 ${t + 17}Z" fill="#26324F"/><path d="M136 ${t + 1} v22" stroke="#FFC83A" stroke-width="4"/><circle cx="136" cy="${t + 25}" r="4.5" fill="#FFC83A"/>`,
    sparkle: star(26, 50, 12) + star(176, 62, 9) + star(182, 152, 7),
    book: '<g transform="rotate(-14 42 150)"><rect x="20" y="124" width="44" height="54" rx="5" fill="#3B82F6"/><rect x="26" y="124" width="6" height="54" fill="#2563EB"/><rect x="56" y="128" width="5" height="46" fill="#fff"/></g>',
    shell: '<path d="M42 84 C40 26 160 26 158 84 L142 72 L126 88 L110 70 L94 88 L78 70 L60 86Z" fill="#FFF8EC" stroke="#E6D9C2" stroke-width="3" stroke-linejoin="round"/>',
    cape: `<path d="M52 96 L22 180 Q100 194 178 180 L148 96Z" fill="${p.capeC || '#E5484D'}"/>`,
  })[n] || '';
}

const EXPR = {
  default: {},
  quiz: { eyes: 'wink', props: ['pencil'] },
  analyzing: { eyes: 'look', props: ['magnifier', 'dots'] },
  danger: { eyes: 'dot', mouth: 'wavy', props: ['sweat'] },
  cheer: { eyes: 'happy', mouth: 'open', props: ['cap', 'sparkle'] },
  sad: { eyes: 'sad', mouth: 'frown' },
};
const GROW = {
  chick: [{ scale: .82, props: ['shell'] }, { glasses: true, props: ['book', 'pencil'] }, { eyes: 'wink', mouth: 'open', back: ['cape'], props: ['cap', 'sparkle', 'pencil'] }],
  owl: [{ noGlasses: true, scale: .78 }, { props: ['book'] }, { eyes: 'happy', mouth: 'open', back: ['cape'], props: ['cap', 'sparkle'] }],
  flame: [{ lvl: 1, scale: .62 }, {}, { lvl: 3, eyes: 'happy', mouth: 'open', props: ['sparkle'] }],
  a: [{ lvl: 1 }, { props: ['pencil'] }, { lvl: 3, eyes: 'happy', mouth: 'open', props: ['cap', 'sparkle'] }],
};

export function mascotSvg(key = 'chick', mood = 'default') {
  const p = P[key] || P.chick;
  const lv = /^lv([123])$/.exec(mood);
  const o = lv ? GROW[key][+lv[1] - 1] : (EXPR[mood] || {});
  const s = o.scale || 1;
  const back = (o.back || []).map(n => prop(p, n)).join('');
  const g = (p.glasses && !o.noGlasses) || o.glasses ? glasses(p) : '';
  const ck = [p.cheek[0], p.cheek[1]].map(x => `<ellipse cx="${x}" cy="${p.cheek[2]}" rx="9" ry="5.5" fill="${p.cheekC}" fill-opacity=".7"/>`).join('');
  const front = (o.props || []).map(n => prop(p, n)).join('');
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><g transform="translate(100 104) scale(${s}) translate(-100 -104)">${back}${body(key, o.lvl || 2)}${ck}${eyes(p, o.eyes || 'open')}${g}${mouth(p, o.mouth || 'n')}${front}</g></svg>`;
}

// SVG를 먼저 보여 주고, PNG가 실제로 불러와지면 그때 PNG로 바꿔요.
// (느린 휴대폰 인터넷에서도 PNG를 기다리는 동안 빈 원이 보이지 않게)
export function mascot(key, mood = 'default', size = 96, extraClass = '') {
  const label = `${CHARACTERS[key]?.name || ''} ${MOODS[mood] || ''}`.trim();
  return `<span class="mascot ${extraClass}" role="img" aria-label="${label}" style="width:${size}px;height:${size}px"><img src="assets/mascot/${key}/${mood}.png" alt="" decoding="async" onload="this.parentNode.classList.add('png')" onerror="this.remove()">${mascotSvg(key, mood)}</span>`;
}

// 사용자 레벨(경험치) → 캐릭터 성장 단계 1~3
export function stageOf(level) {
  return level >= 6 ? 3 : level >= 3 ? 2 : 1;
}
export const STAGE_NAME = { 1: '초보', 2: '열공', 3: '마스터' };

export function levelOf(streak) {
  return streak >= 14 ? 3 : streak >= 3 ? 2 : 1;
}
