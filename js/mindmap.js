// 펼쳐지는 마인드맵 (노드를 누르면 오른쪽으로 하위 개념이 펼쳐지고, 다시 누르면 접힘)
// data: { root, branches: [{ label, children: [{ label, children: [{ label }] }] }] }
// state: 화면을 다시 그려도 유지되는 상태 { open: Set, sel, zoom }
import { esc } from './ui.js';

const ROOT_W = 150;
const NODE_W = 176;
const HGAP = 48;
const VGAP = 12;
const PAD = 20;
const ANIM_MS = 280;

export function toTree(data) {
  const root = { id: 'r', label: data.root, depth: 0, color: -1, children: [], parent: null };
  (data.branches || []).forEach((b, i) => {
    const n = { id: `r.${i}`, label: b.label, depth: 1, color: i % 5, children: [], parent: root };
    (b.children || []).forEach((c, j) => {
      const m = { id: `${n.id}.${j}`, label: c.label, depth: 2, color: n.color, children: [], parent: n };
      (c.children || []).forEach((g, k) => m.children.push({ id: `${m.id}.${k}`, label: g.label, depth: 3, color: n.color, children: [], parent: m }));
      n.children.push(m);
    });
    root.children.push(n);
  });
  return root;
}

const colX = depth => (depth === 0 ? 0 : ROOT_W + HGAP + (depth - 1) * (NODE_W + HGAP));
const all = (n, out = []) => { out.push(n); n.children.forEach(c => all(c, out)); return out; };

export function mountMindmap(host, data, state, { onAsk } = {}) {
  const tree = toTree(data);
  const byId = new Map(all(tree).map(n => [n.id, n]));
  if (!(state.open instanceof Set)) state.open = new Set(['r']);
  state.zoom = state.zoom || 1;

  host.innerHTML = `
    <div class="mm-tools" role="toolbar" aria-label="마인드맵 도구">
      <button type="button" class="btn sm" data-mm="expand">모두 펼치기</button>
      <button type="button" class="btn sm" data-mm="collapse">모두 접기</button>
      <span class="grow"></span>
      <button type="button" class="btn sm icon-btn" data-mm="out" aria-label="축소"><span class="ms" aria-hidden="true">remove</span></button>
      <button type="button" class="btn sm icon-btn" data-mm="in" aria-label="확대"><span class="ms" aria-hidden="true">add</span></button>
      <button type="button" class="btn sm icon-btn" data-mm="fit" aria-label="화면에 맞추기"><span class="ms" aria-hidden="true">fit_screen</span></button>
    </div>
    <div class="mm-wrap" tabindex="0" aria-label="마인드맵. 노드를 눌러 펼치거나 접을 수 있어요">
      <div class="mm-sizer"><div class="mm-canvas"><svg class="mm-lines" aria-hidden="true"></svg></div></div>
    </div>
    <div class="mm-ask" hidden></div>`;
  const wrap = host.querySelector('.mm-wrap');
  const sizer = host.querySelector('.mm-sizer');
  const canvas = host.querySelector('.mm-canvas');
  const svg = host.querySelector('.mm-lines');
  const askBar = host.querySelector('.mm-ask');
  const els = new Map();
  let size = { w: 0, h: 0 };
  let raf = 0;

  const visible = (n, out = []) => { out.push(n); if (state.open.has(n.id)) n.children.forEach(c => visible(c, out)); return out; };

  function nodeEl(n) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `mm-node d${Math.min(n.depth, 3)} c${n.color}`;
    b.dataset.id = n.id;
    b.style.width = `${n.depth === 0 ? ROOT_W : NODE_W}px`;
    b.innerHTML = `<span class="mm-label">${esc(n.label)}</span>${n.children.length ? '<span class="mm-toggle" aria-hidden="true"><span class="ms">chevron_right</span></span>' : ''}`;
    b.addEventListener('click', () => click(n));
    // 새로 나타나는 노드는 부모 자리에서 미끄러져 나옴
    const p = n.parent && els.get(n.parent.id);
    if (p) { b.style.left = p.style.left; b.style.top = p.style.top; b.style.opacity = '0'; }
    canvas.appendChild(b);
    return b;
  }

  function applyZoom() {
    canvas.style.transform = `scale(${state.zoom})`;
    sizer.style.width = `${size.w * state.zoom}px`;
    sizer.style.height = `${size.h * state.zoom}px`;
  }

  function lines() {
    let d = '';
    for (const [id, el] of els) {
      const n = byId.get(id);
      const p = n.parent && els.get(n.parent.id);
      if (!p) continue;
      const x1 = p.offsetLeft + p.offsetWidth, y1 = p.offsetTop + p.offsetHeight / 2;
      const x2 = el.offsetLeft, y2 = el.offsetTop + el.offsetHeight / 2;
      const k = Math.max(16, (x2 - x1) / 2);
      d += `<path class="c${n.color}" d="M${x1} ${y1} C${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}" style="opacity:${el.style.opacity || 1}"/>`;
    }
    svg.innerHTML = d;
  }

  function animateLines() {
    cancelAnimationFrame(raf);
    const end = performance.now() + ANIM_MS + 40;
    const tick = now => { lines(); if (now < end) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }

  function draw() {
    const vis = visible(tree);
    const ids = new Set(vis.map(n => n.id));
    for (const [id, el] of els) if (!ids.has(id)) { el.remove(); els.delete(id); }
    for (const n of vis) if (!els.has(n.id)) els.set(n.id, nodeEl(n));
    for (const n of vis) {
      const el = els.get(n.id);
      el.classList.toggle('sel', state.sel === n.id);
      if (n.children.length) el.setAttribute('aria-expanded', state.open.has(n.id));
    }

    // 배치: 펼쳐진 잎 노드를 위에서부터 쌓고, 부모는 자식들의 가운데
    const pos = {};
    let cursor = PAD;
    const hOf = id => els.get(id).offsetHeight;
    const place = n => {
      const x = PAD + colX(n.depth);
      const kids = state.open.has(n.id) ? n.children : [];
      if (kids.length) {
        kids.forEach(place);
        const a = pos[kids[0].id], b = pos[kids.at(-1).id];
        const cy = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
        pos[n.id] = { x, y: cy - hOf(n.id) / 2, h: hOf(n.id) };
      } else {
        pos[n.id] = { x, y: cursor, h: hOf(n.id) };
        cursor += hOf(n.id) + VGAP;
      }
    };
    place(tree);
    const minY = Math.min(...Object.values(pos).map(p => p.y));
    const shift = minY < PAD ? PAD - minY : 0;
    let w = 0, h = 0;
    for (const n of vis) {
      const p = pos[n.id], el = els.get(n.id);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y + shift}px`;
      el.style.opacity = '1';
      w = Math.max(w, p.x + el.offsetWidth + PAD);
      h = Math.max(h, p.y + shift + p.h + PAD);
    }
    size = { w, h };
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    applyZoom();
    animateLines();

    const sel = state.sel && byId.get(state.sel);
    if (sel && sel.depth > 0 && onAsk) {
      askBar.hidden = false;
      askBar.innerHTML = `<span class="grow ellipsis"><b>${esc(sel.label)}</b></span><button type="button" class="btn sm green" data-mm="ask"><span class="ms" aria-hidden="true">forum</span>자료로 설명 듣기</button>`;
    } else {
      askBar.hidden = true;
    }
  }

  function click(n) {
    state.sel = n.id;
    if (n.children.length) {
      if (state.open.has(n.id)) all(n).forEach(d => state.open.delete(d.id));
      else state.open.add(n.id);
    }
    draw();
    // 펼친 쪽이 보이도록 스크롤
    const el = els.get(n.id);
    if (el && n.children.length && state.open.has(n.id)) {
      const target = (el.offsetLeft + el.offsetWidth + HGAP) * state.zoom;
      if (target + NODE_W * state.zoom > wrap.scrollLeft + wrap.clientWidth) wrap.scrollTo({ left: Math.max(0, target - wrap.clientWidth / 3), behavior: 'smooth' });
    }
  }

  host.querySelector('.mm-tools').addEventListener('click', e => {
    const act = e.target.closest('[data-mm]')?.dataset.mm;
    if (act === 'expand') { all(tree).forEach(n => n.children.length && state.open.add(n.id)); draw(); }
    if (act === 'collapse') { state.open = new Set(['r']); state.sel = null; draw(); wrap.scrollTo({ left: 0, top: 0 }); }
    if (act === 'in') { state.zoom = Math.min(1.6, +(state.zoom + 0.15).toFixed(2)); applyZoom(); }
    if (act === 'out') { state.zoom = Math.max(0.45, +(state.zoom - 0.15).toFixed(2)); applyZoom(); }
    if (act === 'fit') { state.zoom = Math.max(0.45, Math.min(1, (wrap.clientWidth - 8) / size.w)); applyZoom(); }
  });
  askBar.addEventListener('click', e => {
    if (e.target.closest('[data-mm="ask"]')) {
      const n = byId.get(state.sel);
      if (n) onAsk(n.label, n.parent?.depth ? n.parent.label : '');
    }
  });

  draw();
  return () => cancelAnimationFrame(raf);
}
