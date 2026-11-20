'use strict';
const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const C = { ink: '#111110', muted: '#6F6D66', rule: '#D9D6CC', cj: '#2F6B45', cjSoft: '#BFD5C5', hj: '#B5532F', hjSoft: '#EED6CB', gray: '#9C978C', gold: '#C9900F', bg: '#EDEBE4', wall: '#2A2A28' };
function svg(parent, tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  parent.append(el); return el;
}
const press = (bs, f) => bs.forEach((b) => b.setAttribute('aria-pressed', String(f(b))));
const clear = (el) => el.querySelectorAll(':scope > :not(title)').forEach((n) => n.remove());

/* ================= synced comparison player ================= */
// Each video: left half H-JEPA, right half CriticJEPA. One video frame per environment step,
// followed by a short hold on the last frame. Labels are derived from playback time.
class Player {
  constructor(root, opts = {}) {
    this.root = root; this.v = $('video', root); this.sl = $('.st.l', root); this.sr = $('.st.r', root);
    this.range = $('input', root); this.out = $('.step', root); this.hitEl = $('.hit', root); this.btn = $('.pp', root);
    this.ov = $('.overlay', root); this.userPaused = false; this.last = -1; this.d = null;
    this.v.loop = true;
    this.v.addEventListener('play', () => { this.icon(true); this.tick(); });
    this.v.addEventListener('pause', () => this.icon(false));
    ['seeked', 'timeupdate', 'loadeddata'].forEach((e) => this.v.addEventListener(e, () => this.render()));
    this.btn?.addEventListener('click', () => { if (this.v.paused) { this.userPaused = false; this.v.play().catch(() => {}); } else { this.userPaused = true; this.v.pause(); } });
    this.range?.addEventListener('input', () => {
      this.userPaused = true; this.v.pause();
      this.v.currentTime = Math.min((Number(this.range.value) + 0.5) / this.d.fps, (this.v.duration || 1e9) - 0.02);
      this.last = -1; this.render();
    });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduced && !this.userPaused) this.v.play().catch(() => {});
      if (!e.isIntersecting) this.v.pause();
    }, { threshold: 0.35 }).observe(root);
  }
  icon(p) { if (this.btn) { $('path', this.btn).setAttribute('d', p ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5v14l11-7z'); this.btn.setAttribute('aria-label', p ? 'Pause' : 'Play'); } }
  load(d, play) {
    this.d = d; this.last = -1;
    this.v.poster = d.poster; this.v.src = d.src; this.v.currentTime = 0;
    if (this.range) { this.range.max = d.budget; this.hitEl.style.left = `calc(6px + (100% - 12px) * ${d.hit / d.budget})`; }
    if (this.ov) this.ov.textContent = d.overlay || '';
    this.render();
    if (play && !reduced) this.v.play().catch(() => {});
  }
  tick() { this.render(); if (!this.v.paused) requestAnimationFrame(() => this.tick()); }
  render() {
    if (!this.d) return;
    const d = this.d, s = Math.min(d.budget, Math.floor(this.v.currentTime * d.fps + 1e-3));
    if (s === this.last) return; this.last = s;
    if (this.range) { this.range.value = s; this.range.style.setProperty('--p', `${(100 * s) / d.budget}%`); }
    if (this.out) this.out.textContent = `step ${s} / ${d.budget}`;
    const lose = !d.hjHit && s >= d.budget, win = s >= d.hit, hjWin = d.hjHit && s >= d.hjHit;
    this.sl.className = 'st l' + (lose ? ' lose' : hjWin ? ' win' : '');
    this.sl.textContent = lose ? `✕ not reached in ${d.budget} steps` : hjWin ? `✓ goal reached, step ${d.hjHit}` : 'planning…';
    this.sr.className = 'st r' + (win ? ' win' : '');
    this.sr.textContent = win ? `✓ goal reached, step ${d.hit}` : 'planning…';
  }
}

/* ================= AntMaze hero ================= */
const MAZE_DEMOS = window.MAZE_DEMOS || [];
const maze = new Player($('#mazePlayer'));
const picker = $('#mazePicker');
MAZE_DEMOS.forEach((d, i) => {
  const b = document.createElement('button');
  b.textContent = d.label; b.dataset.i = i;
  b.addEventListener('click', () => { maze.userPaused = false; maze.load(d, true); press($$('button', picker), (x) => x === b); $('#mazeCap').dataset.note = d.note || ''; });
  picker.append(b);
});
if (MAZE_DEMOS.length) { maze.load(MAZE_DEMOS[0], false); press($$('button', picker), (x) => x.dataset.i === '0'); }

/* ================= other environments ================= */
const MORE = window.MORE_DEMOS || [];
const moreEl = $('#moreDemos');
for (const d of MORE) {
  const f = document.createElement('figure');
  f.className = 'fig mini';
  f.innerHTML = `<p class="ft">${d.title}</p><div class="media"><div class="vid"><video muted playsinline preload="metadata"></video><span class="tag l">H-JEPA</span><span class="tag r">CriticJEPA</span><span class="st l"></span><span class="st r"></span><figure class="goalchip"><img src="${d.goal}" alt="Goal observation"><figcaption>goal</figcaption></figure></div></div><figcaption>${d.caption}</figcaption>`;
  moreEl.append(f);
  new Player(f).load(d, false);
}

/* ================= 01 restarts ================= */
const RUNS = ['01111101111111001101000101101001110011111111011101', '11010111011011111111100111111011111011111111011101', '11011111111110111101110011110000010111011111011000'];
const grid = $('#grid');
for (let t = 0; t < 50; t++) grid.append(document.createElement('li'));
const RUN_LABELS = ['Run 1', 'Run 2', 'Run 3', 'Any of the three'];
const solvedBy = (k, t) => (k === 3 ? RUNS.some((r) => r[t] === '1') : RUNS[k][t] === '1');
const counts = [0, 1, 2, 3].map((k) => Array.from({ length: 50 }, (_, t) => solvedBy(k, t)).filter(Boolean).length);
const runSeg = $('#runSeg');
counts.forEach((n, k) => {
  const b = document.createElement('button');
  b.dataset.run = k; b.className = 'runbar' + (k === 3 ? ' union' : '');
  b.innerHTML = `<span class="rl">${RUN_LABELS[k]}</span><span class="rt"><i style="width:${(100 * n) / 50}%"></i></span><span class="rn">${2 * n}%</span>`;
  b.addEventListener('click', () => drawRuns(k));
  runSeg.append(b);
});
const runNote = document.createElement('p'); runNote.className = 'runnote';
runNote.innerHTML = `One run solves <b>${Math.round((2 * (counts[0] + counts[1] + counts[2])) / 3)}%</b> on average. Together the three solve <b>${2 * counts[3]}%</b>.`;
runSeg.append(runNote);
function drawRuns(k) {
  $$('li', grid).forEach((li, t) => { const ok = solvedBy(k, t); li.className = ok ? 's' : 'f'; li.setAttribute('aria-label', `Task ${t + 1} ${ok ? 'solved' : 'failed'}`); });
  $('#runRead').innerHTML = `${RUN_LABELS[k]}: <b>${counts[k]} of 50</b> tasks`;
  press($$('.runbar', runSeg), (b) => Number(b.dataset.run) === k);
}
drawRuns(3);

/* ================= 02 optimism ================= */
const STEPS = [0, 10, 30, 90], EXE = [25.282, 23.045, 22.818, 23.406], PRE = [16.652, 9.503, 7.127, 6.718], REF = 20.209;
let dSel = 3;
const diag = $('#diagChart');
function drawDiag() {
  const W = Math.max(280, diag.parentElement.clientWidth - 2), H = W > 520 ? 300 : 240;
  const L = 30, R = W - 10, T = 14, B = H - 36;
  const x = (i) => L + ((R - L) * STEPS[i]) / 90, y = (v) => B - ((B - T) * v) / 30;
  diag.setAttribute('viewBox', `0 0 ${W} ${H}`); clear(diag);
  for (const v of [0, 10, 20, 30]) { svg(diag, 'line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: C.rule }); svg(diag, 'text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, v); }
  STEPS.forEach((s, i) => svg(diag, 'text', { x: x(i), y: B + 18, 'text-anchor': 'middle', class: i === dSel ? 'strong' : '' }, s));
  const up = [...Array(dSel + 1).keys()];
  svg(diag, 'polygon', { points: up.map((i) => `${x(i)},${y(EXE[i])}`).concat(up.slice().reverse().map((i) => `${x(i)},${y(PRE[i])}`)).join(' '), fill: C.hjSoft, opacity: 0.8 });
  svg(diag, 'line', { x1: L, x2: R, y1: y(REF), y2: y(REF), stroke: C.cj, 'stroke-width': 1.8, 'stroke-dasharray': '5 4' });
  svg(diag, 'text', { x: L + 6, y: y(REF) - 7, style: `fill:${C.cj}` }, 'CriticJEPA-0, no gradient steps · 20.2');
  const all = [0, 1, 2, 3];
  svg(diag, 'polyline', { points: all.map((i) => `${x(i)},${y(EXE[i])}`).join(' '), fill: 'none', stroke: C.ink, 'stroke-width': 2 });
  svg(diag, 'polyline', { points: all.map((i) => `${x(i)},${y(PRE[i])}`).join(' '), fill: 'none', stroke: C.hj, 'stroke-width': 2, 'stroke-dasharray': '6 4' });
  all.forEach((i) => {
    const on = i === dSel;
    svg(diag, 'circle', { cx: x(i), cy: y(EXE[i]), r: on ? 5.5 : 3.5, fill: on ? C.ink : C.bg, stroke: C.ink, 'stroke-width': 1.8 });
    svg(diag, 'circle', { cx: x(i), cy: y(PRE[i]), r: on ? 5.5 : 3.5, fill: on ? C.hj : C.bg, stroke: C.hj, 'stroke-width': 1.8 });
  });
  svg(diag, 'text', { x: R, y: y(EXE[3]) - 12, 'text-anchor': 'end', class: 'strong' }, 'executed');
  svg(diag, 'text', { x: R, y: y(PRE[3]) + 20, 'text-anchor': 'end', style: `fill:${C.hj}` }, 'predicted');
  $('#roExe').textContent = EXE[dSel].toFixed(1); $('#roPre').textContent = PRE[dSel].toFixed(1); $('#roOpt').textContent = (EXE[dSel] - PRE[dSel]).toFixed(1);
  press($$('#diagSeg button'), (b) => Number(b.dataset.step) === dSel);
}
$$('#diagSeg button').forEach((b) => b.addEventListener('click', () => { dSel = Number(b.dataset.step); drawDiag(); }));

/* ================= 03 candidate sources ================= */
const SRC = [{ k: 'hj', n: 'search outputs', s: 'H-JEPA, ≤90 gradient steps' }, { k: 'rt', n: 'retrieved plans', s: 'nearest training data' }, { k: 'cj', n: 'flow proposals', s: 'goal-conditioned' }];
const MET = {
  rho: { q: 'Does the model order the eight plans the way reality does? Rank correlation, higher is better.', v: [-0.03, 0.41, 0.28], lo: -0.1, hi: 0.5, f: (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2), best: 'max', zero: true },
  top1: { q: 'How often is its pick truly the best of the eight? Chance is 12.5%.', v: [12.0, 27.0, 22.0], lo: 0, hi: 32, f: (v) => v.toFixed(1) + '%', best: 'max', chance: 12.5 },
  err: { q: 'How far from the goal does its pick actually end? Lower is better, and this is what control cares about.', v: [24.3, 30.1, 23.0], lo: 0, hi: 34, f: (v) => v.toFixed(1), best: 'min' },
  opt: { q: 'How much rosier is the prediction than reality, on average? Lower is better.', v: [17.4, 1.9, 1.2], lo: 0, hi: 20, f: (v) => v.toFixed(1), best: 'min' },
};
const cbars = $('#candBars');
for (const s of SRC) { const r = document.createElement('div'); r.className = `cb ${s.k}`; r.innerHTML = `<div class="nm">${s.n}<small>${s.s}</small></div><div class="track"><i class="zero"></i><i class="chance"><span>chance</span></i><i class="fill"></i><span class="v"></span></div>`; cbars.append(r); }
function drawCand(m) {
  const M = MET[m], pos = (v) => (100 * (v - M.lo)) / (M.hi - M.lo), best = M.best === 'max' ? Math.max(...M.v) : Math.min(...M.v);
  $('#candQ').textContent = M.q;
  $$('.cb', cbars).forEach((row, i) => {
    const v = M.v[i], z = pos(Math.max(M.lo, 0)), p = pos(v);
    Object.assign($('.fill', row).style, { left: `${Math.min(z, p)}%`, width: `${Math.abs(p - z)}%` });
    const lab = $('.v', row), right = Math.max(z, p), inside = right > 70;
    lab.style.left = `${right}%`; lab.textContent = M.f(v); lab.classList.toggle('in', inside);
    Object.assign($('.zero', row).style, { display: M.zero ? '' : 'none', left: `${z}%` });
    const ch = $('.chance', row); ch.style.display = M.chance ? '' : 'none'; if (M.chance) ch.style.left = `${pos(M.chance)}%`; $('span', ch).style.display = i ? 'none' : '';
    row.classList.toggle('best', v === best);
  });
  press($$('#candSeg button'), (b) => b.dataset.m === m);
}
$$('#candSeg button').forEach((b) => b.addEventListener('click', () => drawCand(b.dataset.m)));
drawCand('rho');

/* ================= 04 method schematic on the real maze layout ================= */
const MAZE = ['11111111', '10011001', '10010001', '11000111', '10010001', '10100101', '10001001', '11111111'].map((r) => [...r].map(Number));
const CS = 38, OX = 12, OY = 12;
const cc = (i, j) => [OX + j * CS + CS / 2, OY + i * CS + CS / 2];
const START = [6, 1], GOAL = [1, 6];
function bfsPath(a, b) {
  const key = (p) => p.join(','), prev = new Map([[key(a), null]]), q = [a];
  while (q.length) {
    const p = q.shift(); if (key(p) === key(b)) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [p[0] + di, p[1] + dj]; if (!MAZE[n[0]][n[1]] && !prev.has(key(n))) { prev.set(key(n), p); q.push(n); } }
  }
  const out = []; for (let p = b; p; p = prev.get(key(p))) out.unshift(p); return out;
}
const mSvg = $('#mSvg');
const inWall = (x, y) => { const j = Math.floor((x - OX) / CS), i = Math.floor((y - OY) / CS); return MAZE[i]?.[j] === 1; };
function smoothD(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let k = 1; k < pts.length - 1; k++) { const [a, b] = [pts[k], pts[k + 1]]; d += ` Q${a[0]},${a[1]} ${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}`; }
  const e = pts[pts.length - 1]; return d + ` L${e[0]},${e[1]}`;
}
const OPT_PRED = [16.7, 9.5, 7.1, 6.7], OPT_EXE = [25.3, 23.0, 22.8, 23.4];
// Gradient view: six imagined subgoals start as a sensible corridor plan and are pulled straight at the goal.
const corridor = bfsPath(START, GOAL).map(([i, j]) => cc(i, j));
const sample = (pts, n) => Array.from({ length: n }, (_, k) => pts[Math.round((k * (pts.length - 1)) / (n - 1))]);
const optStart = sample(corridor.slice(0, 7), 7).slice(1);
const s0 = cc(...START), g0 = cc(...GOAL);
const optEnd = Array.from({ length: 6 }, (_, k) => { const t = (k + 1) / 6; return [s0[0] + (g0[0] - s0[0]) * t, s0[1] + (g0[1] - s0[1]) * t]; });
// Selection view: candidate plans drawn along corridors toward different cells; the critic keeps the best.
const TARGETS = [[1, 6], [4, 6], [2, 4], [6, 3], [4, 1], [1, 1]];
const cands = TARGETS.map((t, n) => { const p = bfsPath(START, t).map(([i, j]) => cc(i, j)); const off = (n - 2.5) * 2.2; return p.slice(0, 9).map(([x, y]) => [x + off, y - off]); });
const dist = (p) => Math.hypot(p[0] - g0[0], p[1] - g0[1]);
const candScore = cands.map((p) => bfsPath([Math.floor((p[p.length - 1][1] - OY) / CS), Math.floor((p[p.length - 1][0] - OX) / CS)], GOAL).length);
const bestC = candScore.indexOf(Math.min(...candScore));
let mMode = 'opt', mTimer = 0;
function base() {
  clear(mSvg);
  svg(mSvg, 'rect', { x: OX, y: OY, width: CS * 8, height: CS * 8, fill: '#F7F6F1', rx: 4 });
  MAZE.forEach((r, i) => r.forEach((w, j) => w && svg(mSvg, 'rect', { x: OX + j * CS, y: OY + i * CS, width: CS, height: CS, fill: C.wall })));
  svg(mSvg, 'circle', { cx: s0[0], cy: s0[1], r: 7, fill: C.ink });
  svg(mSvg, 'circle', { cx: g0[0], cy: g0[1], r: 9, fill: C.gold });
  svg(mSvg, 'text', { x: s0[0], y: s0[1] + 22, 'text-anchor': 'middle', style: 'font:11px var(--mono);fill:#F7F6F1' }, '');
}
const PX = 352, PW = 290;
function drawOpt(k) {
  base();
  const t = k / 3, pts = optStart.map((p, n) => [p[0] + (optEnd[n][0] - p[0]) * t, p[1] + (optEnd[n][1] - p[1]) * t]);
  svg(mSvg, 'path', { d: smoothD([s0, ...pts]), fill: 'none', stroke: C.hj, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.9 });
  pts.forEach(([x, y]) => { const bad = inWall(x, y); svg(mSvg, 'circle', { cx: x, cy: y, r: bad ? 7 : 5, fill: bad ? '#F7F6F1' : C.hj, stroke: C.hj, 'stroke-width': 2.2 }); });
  svg(mSvg, 'text', { x: PX, y: 30, style: `font:12px var(--mono);fill:${C.ink}` }, `after ${STEPS[k]} gradient steps`);
  const bars = [['predicted by the model', OPT_PRED[k], C.hj], ['reached when executed', OPT_EXE[k], C.ink]];
  bars.forEach(([lab, v, col], n) => {
    const y = 70 + n * 64;
    svg(mSvg, 'text', { x: PX, y, style: 'font:11.5px var(--mono);fill:#6F6D66' }, lab);
    svg(mSvg, 'rect', { x: PX, y: y + 10, width: (PW - 50) * (v / 26), height: 16, fill: col, opacity: n ? 1 : 0.85 });
    svg(mSvg, 'text', { x: PX + (PW - 50) * (v / 26) + 8, y: y + 23, style: `font:12px var(--mono);fill:${C.ink}` }, v.toFixed(1));
  });
  const nIn = pts.filter(([x, y]) => inWall(x, y)).length;
  svg(mSvg, 'text', { x: PX, y: 230, style: `font:12px var(--mono);fill:${nIn ? C.hj : C.muted}` }, nIn ? `${nIn} imagined subgoals now inside walls` : 'imagined subgoals follow the corridor');
  svg(mSvg, 'text', { x: PX, y: 300, style: 'font:10.5px var(--mono);fill:#6F6D66' }, 'error values: measured, finding 02');
  svg(mSvg, 'text', { x: PX, y: 316, style: 'font:10.5px var(--mono);fill:#6F6D66' }, 'path: schematic');
  $('#mHead').textContent = 'Optimize with gradients';
  $('#mBody').textContent = 'Each step pulls the imagined plan toward the goal. The model scores it better and better, but the plan straightens through walls, and the executed error barely moves.';
}
function drawSel(phase) {
  base();
  cands.forEach((p, n) => {
    const best = n === bestC, show = phase >= 1;
    svg(mSvg, 'path', { d: smoothD(p), fill: 'none', stroke: phase === 2 ? (best ? C.cj : '#BDB8AC') : C.cj, 'stroke-width': phase === 2 && best ? 3.4 : 2, 'stroke-linecap': 'round', opacity: show ? (phase === 2 && !best ? 0.8 : 0.85) : 0 });
    const e = p[p.length - 1];
    if (show) svg(mSvg, 'circle', { cx: e[0], cy: e[1], r: phase === 2 && best ? 6 : 4, fill: phase === 2 && !best ? '#BDB8AC' : C.cj });
  });
  svg(mSvg, 'text', { x: PX, y: 30, style: `font:12px var(--mono);fill:${C.ink}` }, phase < 2 ? `${cands.length} proposals from the flow head` : 'frozen model: predicted distance to goal');
  if (phase >= 1) cands.forEach((p, n) => {
    const y = 52 + n * 30, w = (PW - 60) * (candScore[n] / Math.max(...candScore));
    const best = n === bestC;
    svg(mSvg, 'rect', { x: PX, y, width: phase === 2 ? w : 0, height: 14, fill: best ? C.cj : '#BDB8AC' });
    svg(mSvg, 'text', { x: PX + (phase === 2 ? w : 0) + 8, y: y + 11, style: `font:11.5px var(--mono);fill:${best ? C.cj : C.muted}` }, phase === 2 ? (best ? 'chosen' : '') : `plan ${n + 1}`);
  });
  svg(mSvg, 'text', { x: PX, y: 316, style: 'font:10.5px var(--mono);fill:#6F6D66' }, 'schematic');
  $('#mHead').textContent = 'Propose, then select';
  $('#mBody').textContent = 'The proposer learned from real trajectories, so its plans follow the corridors. The frozen model only compares them and keeps the one predicted to land closest. Its first chunk runs, then everything replans.';
}
function runMethod(mode) {
  clearTimeout(mTimer); mMode = mode; press($$('#mSeg [data-mode]'), (b) => b.dataset.mode === mode);
  const frames = mode === 'opt' ? [0, 1, 2, 3] : [0, 1, 2];
  const draw = mode === 'opt' ? drawOpt : drawSel;
  if (reduced) return draw(frames[frames.length - 1]);
  let k = 0; const go = () => { draw(frames[k]); if (++k < frames.length) mTimer = setTimeout(go, mode === 'opt' ? 1100 : 1300); }; go();
}
$$('#mSeg [data-mode]').forEach((b) => b.addEventListener('click', () => runMethod(b.dataset.mode)));
$('#mPlay').addEventListener('click', () => runMethod(mMode));
let mStarted = false;
new IntersectionObserver(([e]) => { if (e.isIntersecting && !mStarted) { mStarted = true; runMethod('opt'); } }, { threshold: 0.5 }).observe(mSvg);
drawOpt(0);

/* ================= 05 results ================= */
const PTS = [
  { n: 'H-JEPA', x: 131.0, y: 67.6, k: 'hj' }, { n: 'single proposal', x: 0.25, y: 44.7, k: 'sp' },
  { n: 'CriticJEPA-0, small pool', x: 0.36, y: 68.7, k: 'c0', f: 1 }, { n: 'CriticJEPA-0', x: 1.62, y: 78.7, k: 'c0', f: 1 },
  { n: 'K=2', x: 2.51, y: 88.2, k: 'cx', f: 1 }, { n: 'CriticJEPA-5', x: 5.11, y: 89.1, k: 'c5', f: 1 }, { n: 'larger pool', x: 9.97, y: 90.9, k: 'cx', f: 1 },
];
const sc = $('#scatter');
function drawScatter() {
  const W = Math.max(280, sc.parentElement.clientWidth - 2), H = Math.round(W * 0.62);
  const L = 30, R = W - 12, T = 14, B = H - 34;
  const lx = (v) => L + ((R - L) * (Math.log10(v) - Math.log10(0.15))) / (Math.log10(300) - Math.log10(0.15)), ly = (v) => B - ((B - T) * (v - 40)) / 55;
  sc.setAttribute('viewBox', `0 0 ${W} ${H}`); clear(sc);
  for (const v of [40, 60, 80]) { svg(sc, 'line', { x1: L, x2: R, y1: ly(v), y2: ly(v), stroke: C.rule }); svg(sc, 'text', { x: L - 6, y: ly(v) + 4, 'text-anchor': 'end' }, v); }
  for (const v of [0.3, 1, 3, 10, 30, 100]) svg(sc, 'text', { x: lx(v), y: B + 17, 'text-anchor': 'middle' }, v);
  svg(sc, 'text', { x: R, y: H - 2, 'text-anchor': 'end' }, 'TFLOPs per episode →');
  svg(sc, 'text', { x: L, y: T - 2 }, 'success %');
  svg(sc, 'line', { x1: lx(0.36), x2: lx(131), y1: ly(67.6), y2: ly(67.6), stroke: C.hj, 'stroke-dasharray': '3 4', opacity: 0.7 });
  const fr = PTS.filter((p) => p.f).sort((a, b) => a.x - b.x);
  svg(sc, 'polyline', { points: fr.map((p) => `${lx(p.x)},${ly(p.y)}`).join(' '), fill: 'none', stroke: C.cj, 'stroke-width': 1.6, opacity: 0.6 });
  for (const p of PTS) {
    const st = { hj: [C.hj, C.hj], sp: [C.bg, C.gray], c0: [C.bg, C.cj], cx: [C.cjSoft, C.cj], c5: [C.cj, C.cj] }[p.k];
    svg(sc, 'circle', { cx: lx(p.x), cy: ly(p.y), r: p.k === 'c5' || p.k === 'hj' ? 6.5 : 4.5, fill: st[0], stroke: st[1], 'stroke-width': 1.8 });
  }
  const lab = (p, dx, dy, a, cls) => svg(sc, 'text', { x: lx(p.x) + dx, y: ly(p.y) + dy, 'text-anchor': a, class: cls || '' }, `${p.n} ${p.y}`);
  lab(PTS[0], 0, 20, 'middle', 'strong'); lab(PTS[1], 9, 4, 'start'); lab(PTS[3], 9, 15, 'start'); lab(PTS[5], 0, -13, 'middle', 'strong');
  svg(sc, 'text', { x: lx(0.36) + 8, y: ly(68.7) + 17 }, 'matches H-JEPA at 1/360 compute');
}
const KS = [0, 2, 5, 10, 20], KV = [84.0, 94.7, 93.3, 91.3, 90.7];
const kc = $('#kChart');
function drawK() {
  const W = Math.max(280, kc.parentElement.clientWidth - 2), H = Math.round(W * 0.62);
  const L = 30, R = W - 14, T = 22, B = H - 34;
  const x = (k) => L + ((R - L) * k) / 20, y = (v) => B - ((B - T) * (v - 65)) / 35;
  kc.setAttribute('viewBox', `0 0 ${W} ${H}`); clear(kc);
  for (const v of [70, 80, 90, 100]) { svg(kc, 'line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: C.rule }); svg(kc, 'text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, v); }
  KS.forEach((k) => svg(kc, 'text', { x: x(k), y: B + 17, 'text-anchor': 'middle' }, k));
  svg(kc, 'text', { x: R, y: H - 2, 'text-anchor': 'end' }, 'polish steps K →');
  svg(kc, 'text', { x: L, y: T - 8 }, 'success %');
  svg(kc, 'line', { x1: L, x2: R, y1: y(72), y2: y(72), stroke: C.hj, 'stroke-dasharray': '5 4', 'stroke-width': 1.5 });
  svg(kc, 'text', { x: R, y: y(72) + 15, 'text-anchor': 'end', style: `fill:${C.hj}` }, 'H-JEPA 72.0');
  svg(kc, 'polyline', { points: KS.map((k, i) => `${x(k)},${y(KV[i])}`).join(' '), fill: 'none', stroke: C.cj, 'stroke-width': 2.2 });
  KS.forEach((k, i) => {
    svg(kc, 'circle', { cx: x(k), cy: y(KV[i]), r: i === 1 ? 6 : 4, fill: i === 1 ? C.cj : C.bg, stroke: C.cj, 'stroke-width': 1.8 });
    svg(kc, 'text', { x: x(k), y: y(KV[i]) + (i === 0 ? 19 : -11), 'text-anchor': i === 4 ? 'end' : 'middle', class: i === 1 ? 'strong' : '' }, KV[i].toFixed(1));
  });
}
const ROWS = [['AntMaze', 'three levels', 67.6, 78.7, 89.1, 26], ['Push-T', 'two levels', 43.3, 52.0, 57.3, 79], ['Push-T', 'three levels', 9.3, 18.7, 22.7, 13], ['Cube', 'two levels', 49.3, 100, 92.0, 44], ['Cube', 'three levels', 48.7, 100, 100, 50], ['FourRoom', 'three levels', 96.0, 100, 100, 14]];
const db = $('#dumbbell');
function drawDumb() {
  db.replaceChildren();
  const row = (cls) => { const d = document.createElement('div'); d.className = cls; db.append(d); return d; };
  const ax = row('drow axis'); ax.append(document.createElement('span')); const as = document.createElementNS(NS, 'svg'); ax.append(as, document.createElement('span'));
  const items = ROWS.map((r) => { const d = row('drow'); d.innerHTML = `<div class="env">${r[0]}<small>${r[1]}</small></div>`; const s = document.createElementNS(NS, 'svg'); const q = document.createElement('div'); q.className = 'ratio'; q.textContent = `${r[5]}×`; d.append(s, q); return [r, s]; });
  const W = as.getBoundingClientRect().width || 400, x = (v) => 6 + ((W - 12) * v) / 100;
  as.setAttribute('viewBox', `0 0 ${W} 18`); as.style.height = '18px';
  for (const v of [0, 25, 50, 75, 100]) svg(as, 'text', { x: x(v), y: 13, 'text-anchor': v === 0 ? 'start' : v === 100 ? 'end' : 'middle' }, v + '%');
  const f = (v) => (v % 1 ? v.toFixed(1) : String(v));
  for (const [r, s] of items) {
    s.setAttribute('viewBox', `0 0 ${W} 46`);
    for (const v of [0, 25, 50, 75, 100]) svg(s, 'line', { x1: x(v), x2: x(v), y1: 14, y2: 34, stroke: '#E0DDD3' });
    const [, , h, c0, c5] = r, lo = Math.min(h, c0, c5), hi = Math.max(h, c0, c5);
    svg(s, 'line', { x1: x(lo), x2: x(hi), y1: 24, y2: 24, stroke: C.cjSoft, 'stroke-width': 3 });
    svg(s, 'circle', { cx: x(h), cy: 24, r: 5.5, fill: C.hj });
    svg(s, 'circle', { cx: x(c0), cy: 24, r: 7, fill: C.bg, stroke: C.cj, 'stroke-width': 2 });
    svg(s, 'circle', { cx: x(c5), cy: 24, r: 4.5, fill: C.cj });
    const near = hi - h < 12, edge = (v) => (v > 96 ? 'end' : 'middle'), nx = (v) => x(v) + (v > 96 ? 8 : 0);
    svg(s, 'text', { x: x(h) - (near ? 10 : 0), y: near ? 44 : 10, 'text-anchor': near ? 'end' : 'middle', style: `fill:${C.hj}` }, f(h));
    svg(s, 'text', { x: nx(c5), y: 10, 'text-anchor': edge(c5), style: `fill:${C.cj}` }, c0 === c5 ? `${f(c5)} (both)` : f(c5));
    if (c0 !== c5) svg(s, 'text', { x: nx(c0), y: 44, 'text-anchor': edge(c0), style: `fill:${C.cj}` }, f(c0));
  }
}

$('#copyBib').addEventListener('click', async () => {
  const b = $('#copyBib');
  try { await navigator.clipboard.writeText($('#bibtex').textContent); b.textContent = 'copied'; } catch { b.textContent = 'select and copy'; }
  setTimeout(() => (b.textContent = 'copy'), 1600);
});
function drawAll() { drawDiag(); drawScatter(); drawK(); drawDumb(); }
let rz = 0; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(drawAll); });
drawAll();
