'use strict';
const NS = 'http://www.w3.org/2000/svg';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function svg(parent, tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  parent.append(el);
  return el;
}
function press(buttons, pred) { buttons.forEach((b) => b.setAttribute('aria-pressed', String(pred(b)))); }
const C = { cj: '#2346C9', cjSoft: '#9FB1EE', hj: '#7A8592', bad: '#CF4F34', badSoft: '#F4D9D1', rule: '#DDD9CE', ink: '#121A17', muted: '#5F6863', paper: '#FCFBF8' };

/* ---------------- nav ---------------- */
const nav = $('.topnav');
const heroEl = document.getElementById('top');
const navState = () => { nav.classList.toggle('scrolled', scrollY > 8); nav.classList.toggle('dark', scrollY < heroEl.offsetHeight - 40); };
addEventListener('scroll', navState, { passive: true });
navState();
const navLinks = $$('.navlinks a');
const navIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('on', a.hash === '#' + e.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
['insight', 'method', 'results', 'cite'].forEach((id) => navIO.observe(document.getElementById(id)));

/* ---------------- demo player ---------------- */
// Recorded rollouts: one video frame per environment step; left half H-JEPA, right half CriticJEPA.
const DEMOS = [
  { id: 'pusht-024', env: 'pusht', envName: 'Push-T', short: 'Push-T', task: 24, unseen: false, arm: 'CriticJEPA-5', budget: 90, fps: 15, hit: 75 },
  { id: 'pusht-015', env: 'pusht', envName: 'Push-T', short: 'Push-T', task: 15, unseen: false, arm: 'CriticJEPA-5', budget: 90, fps: 15, hit: 83 },
  { id: 'ant-044', env: 'ant', envName: 'Visual AntMaze', short: 'AntMaze', task: 44, unseen: false, arm: 'CriticJEPA-5', budget: 350, fps: 28, hit: 195 },
  { id: 'ant-unseen-011', env: 'ant', envName: 'Visual AntMaze', short: 'AntMaze', task: 11, unseen: true, arm: 'CriticJEPA-5', budget: 350, fps: 28, hit: 79 },
  { id: 'ant-015', env: 'ant', envName: 'Visual AntMaze', short: 'AntMaze', task: 15, unseen: false, arm: 'CriticJEPA-5', budget: 350, fps: 28, hit: 300 },
  { id: 'cube-009', env: 'cube', envName: 'OGBench Cube', short: 'Cube', task: 9, unseen: false, arm: 'CriticJEPA-5', budget: 30, fps: 8, hit: 14 },
  { id: 'cube-030', env: 'cube', envName: 'OGBench Cube', short: 'Cube', task: 30, unseen: false, arm: 'CriticJEPA-5', budget: 30, fps: 8, hit: 16 },
  { id: 'fourroom-029', env: 'fourroom', envName: 'FourRoom', short: 'FourRoom', task: 29, unseen: false, arm: 'CriticJEPA-0', budget: 210, fps: 20, hit: 171 },
];
const video = $('#demoVideo'), scrub = $('#scrub'), stepOut = $('#stepOut');
const statusL = $('#statusL'), statusR = $('#statusR'), playBtn = $('#playBtn'), playIcon = $('#playIcon');
const casesEl = $('#cases');
let demo = DEMOS[0], inView = false, userPaused = false, lastStep = -1;
const pad3 = (n) => String(n).padStart(3, '0');

for (const d of DEMOS) {
  const b = document.createElement('button');
  b.className = 'case';
  b.dataset.id = d.id;
  b.innerHTML = `<img src="assets/demos/${d.id}-goal.png" alt="" loading="lazy"><span>${d.short}</span><small>${d.unseen ? 'unseen ' : ''}${pad3(d.task)}</small>`;
  b.addEventListener('click', () => { userPaused = false; load(d, true); });
  casesEl.append(b);
}

function setIcon(playing) {
  playIcon.setAttribute('d', playing ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5v14l11-7z');
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function stepNow() { return Math.min(demo.budget, Math.floor(video.currentTime * demo.fps + 1e-3)); }
function render() {
  const s = stepNow();
  if (s === lastStep) return;
  lastStep = s;
  scrub.value = s;
  scrub.style.setProperty('--p', `${(100 * s) / demo.budget}%`);
  stepOut.textContent = `Step ${s} / ${demo.budget}`;
  const lose = s >= demo.budget, win = s >= demo.hit;
  statusL.className = 'status left' + (lose ? ' lose' : '');
  statusL.textContent = lose ? `Goal not reached in ${demo.budget} steps` : 'Planning…';
  statusR.className = 'status right' + (win ? ' win' : '');
  statusR.textContent = win ? `Goal reached at step ${demo.hit}` : 'Planning…';
}
function loop() { render(); if (!video.paused) requestAnimationFrame(loop); }
function load(d, autoplay) {
  demo = d; lastStep = -1;
  press($$('.case'), (b) => b.dataset.id === d.id);
  video.poster = `assets/demos/${d.id}-poster.jpg`;
  video.src = `assets/demos/${d.id}.mp4`;
  $('#goalImg').src = `assets/demos/${d.id}-goal.png`;
  $('#armName').textContent = d.arm;
  $('#factLine').textContent = `${d.envName}, ${d.unseen ? 'unseen task' : 'task'} ${pad3(d.task)}, ${d.budget}-step budget.`;
  $('#frLegend').hidden = d.env !== 'fourroom';
  scrub.max = d.budget;
  $('#hitMark').style.left = `calc(8px + (100% - 16px) * ${d.hit / d.budget})`;
  video.currentTime = 0;
  render();
  if (autoplay && !reduced) video.play().catch(() => {});
}
video.loop = true;
video.addEventListener('play', () => { setIcon(true); loop(); });
video.addEventListener('pause', () => setIcon(false));
video.addEventListener('seeked', render);
video.addEventListener('timeupdate', render);
playBtn.addEventListener('click', () => {
  if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); }
});
scrub.addEventListener('input', () => {
  userPaused = true;
  video.pause();
  const s = Number(scrub.value);
  video.currentTime = Math.min((s + 0.5) / demo.fps, (video.duration || 1e9) - 0.01);
  lastStep = -1;
  render();
});
new IntersectionObserver(([e]) => {
  inView = e.isIntersecting;
  if (inView && !reduced && !userPaused) video.play().catch(() => {});
  if (!inView) video.pause();
}, { threshold: 0.3 }).observe($('.videobox'));
load(DEMOS[0], false);

/* ---------------- finding 01: optimism ---------------- */
const STEPS = [0, 10, 30, 90];
const EXE = [25.282, 23.045, 22.818, 23.406];
const PRE = [16.652, 9.503, 7.127, 6.718];
const REF = 20.209;
let diagSel = 3;
const diag = $('#diagChart');
function drawDiag() {
  const W = Math.max(280, diag.parentElement.clientWidth - 2), H = W > 520 ? 320 : 260;
  const L = 34, R = W - 14, T = 18, B = H - 44;
  const x = (i) => L + ((R - L) * STEPS[i]) / 90;
  const y = (v) => B - ((B - T) * v) / 30;
  diag.setAttribute('viewBox', `0 0 ${W} ${H}`);
  diag.querySelectorAll(':not(title)').forEach((n) => n.remove());
  for (const v of [0, 10, 20, 30]) {
    svg(diag, 'line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: C.rule });
    svg(diag, 'text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, v);
  }
  STEPS.forEach((s, i) => svg(diag, 'text', { x: x(i), y: B + 18, 'text-anchor': 'middle', class: i === diagSel ? 'strong' : '' }, s));
  svg(diag, 'text', { x: (L + R) / 2, y: H - 6, 'text-anchor': 'middle' }, 'H-JEPA gradient steps');
  // optimism band up to selection
  const upto = [...Array(diagSel + 1).keys()];
  const band = upto.map((i) => `${x(i)},${y(EXE[i])}`).concat(upto.slice().reverse().map((i) => `${x(i)},${y(PRE[i])}`)).join(' ');
  svg(diag, 'polygon', { points: band, fill: C.badSoft, opacity: 0.75 });
  const ghost = [...Array(4).keys()];
  // reference
  svg(diag, 'line', { x1: L, x2: R, y1: y(REF), y2: y(REF), stroke: C.cj, 'stroke-width': 2, 'stroke-dasharray': '6 5' });
  svg(diag, 'text', { x: L + 6, y: y(REF) - 7, style: `fill:${C.cj};font-weight:600` }, 'CriticJEPA-0 · 20.2');
  // lines
  svg(diag, 'polyline', { points: ghost.map((i) => `${x(i)},${y(EXE[i])}`).join(' '), fill: 'none', stroke: C.hj, 'stroke-width': 2.5 });
  svg(diag, 'polyline', { points: ghost.map((i) => `${x(i)},${y(PRE[i])}`).join(' '), fill: 'none', stroke: C.bad, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' });
  ghost.forEach((i) => {
    const on = i === diagSel;
    svg(diag, 'circle', { cx: x(i), cy: y(EXE[i]), r: on ? 6 : 4, fill: on ? C.hj : C.paper, stroke: C.hj, 'stroke-width': 2.2 });
    svg(diag, 'circle', { cx: x(i), cy: y(PRE[i]), r: on ? 6 : 4, fill: on ? C.bad : C.paper, stroke: C.bad, 'stroke-width': 2.2 });
  });
  // bracket
  const bx = x(diagSel) + (diagSel === 3 ? -16 : 16);
  svg(diag, 'line', { x1: bx, x2: bx, y1: y(EXE[diagSel]) + 7, y2: y(PRE[diagSel]) - 7, stroke: C.bad, 'stroke-width': 1.6, 'marker-start': '' });
  const end = diagSel === 3 ? 'end' : 'start';
  const lx = x(diagSel) + (diagSel === 3 ? -22 : 22);
  const my = (y(EXE[diagSel]) + y(PRE[diagSel])) / 2;
  svg(diag, 'text', { x: lx, y: my + 4, 'text-anchor': end, style: `fill:${C.bad};font-weight:700;font-size:13px` }, `optimism ${(EXE[diagSel] - PRE[diagSel]).toFixed(1)}`);
  svg(diag, 'text', { x: R, y: y(EXE[3]) - 12, 'text-anchor': 'end', style: `fill:${C.ink};font-weight:600` }, 'executed');
  svg(diag, 'text', { x: R, y: y(PRE[3]) + 20, 'text-anchor': 'end', style: `fill:${C.bad};font-weight:600` }, 'predicted');
  $('#roExe').textContent = EXE[diagSel].toFixed(1);
  $('#roPre').textContent = PRE[diagSel].toFixed(1);
  $('#roOpt').textContent = (EXE[diagSel] - PRE[diagSel]).toFixed(1);
  press($$('#diagSeg button'), (b) => Number(b.dataset.step) === diagSel);
}
$$('#diagSeg button').forEach((b) => b.addEventListener('click', () => { diagSel = Number(b.dataset.step); drawDiag(); }));

/* ---------------- finding 02: candidate sources ---------------- */
const SOURCES = [
  { key: 'hj', name: 'Search outputs', sub: 'H-JEPA, up to 90 steps' },
  { key: 'rt', name: 'Dataset plans', sub: 'retrieved by start state' },
  { key: 'cj', name: 'Flow proposals', sub: 'goal-conditioned' },
];
const METRICS = {
  rho: { q: 'Do the model’s scores order the eight plans like reality does? Rank correlation, higher is better.', v: [-0.03, 0.41, 0.28], lo: -0.1, hi: 0.5, fmt: (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2), best: 'max', zero: true },
  top1: { q: 'How often is the model’s pick the truly best of eight? Chance is 12.5%.', v: [12.0, 27.0, 22.0], lo: 0, hi: 32, fmt: (v) => v.toFixed(1) + '%', best: 'max', chance: 12.5 },
  err: { q: 'How far from the goal does the picked plan actually end? Lower is better. This is what control cares about.', v: [24.3, 30.1, 23.0], lo: 0, hi: 34, fmt: (v) => v.toFixed(1), best: 'min' },
  opt: { q: 'How much rosier is the prediction than reality, on average? Lower is better.', v: [17.4, 1.9, 1.2], lo: 0, hi: 20, fmt: (v) => v.toFixed(1), best: 'min' },
};
const candBars = $('#candBars');
for (const s of SOURCES) {
  const row = document.createElement('div');
  row.className = `cb ${s.key}`;
  row.innerHTML = `<div class="nm">${s.name}<small>${s.sub}</small></div><div class="track"><i class="zero"></i><i class="chance"><span>chance</span></i><i class="fill"></i><span class="v"></span></div>`;
  candBars.append(row);
}
function drawCand(m) {
  const M = METRICS[m];
  $('#candQ').textContent = M.q;
  const pos = (v) => (100 * (v - M.lo)) / (M.hi - M.lo);
  const bestV = M.best === 'max' ? Math.max(...M.v) : Math.min(...M.v);
  $$('.cb', candBars).forEach((row, i) => {
    const v = M.v[i], z = pos(Math.max(M.lo, 0)), p = pos(v);
    const fill = $('.fill', row), lab = $('.v', row);
    fill.style.left = `${Math.min(z, p)}%`;
    fill.style.width = `${Math.abs(p - z)}%`;
    lab.style.left = `${Math.max(z, p)}%`;
    lab.textContent = M.fmt(v);
    $('.zero', row).style.display = M.zero ? '' : 'none';
    $('.zero', row).style.left = `${z}%`;
    const ch = $('.chance', row);
    ch.style.display = M.chance ? '' : 'none';
    if (M.chance) ch.style.left = `${pos(M.chance)}%`;
    $('span', ch).style.display = i === 0 ? '' : 'none';
    row.classList.toggle('best', v === bestV);
  });
  press($$('#candSeg button'), (b) => b.dataset.m === m);
}
$$('#candSeg button').forEach((b) => b.addEventListener('click', () => drawCand(b.dataset.m)));
drawCand('rho');

/* ---------------- finding 03: restarts ---------------- */
const RUNS = [
  '01111101111111001101000101101001110011111111011101',
  '11010111011011111111100111111011111011111111011101',
  '11011111111110111101110011110000010111011111011000',
];
const grid = $('#grid');
for (let t = 0; t < 50; t++) { const li = document.createElement('li'); li.textContent = t + 1; grid.append(li); }
function drawRuns(k) {
  const union = k === 3;
  let n = 0;
  $$('li', grid).forEach((li, t) => {
    const ok = union ? RUNS.some((r) => r[t] === '1') : RUNS[k][t] === '1';
    n += ok;
    li.className = ok ? 's' : 'f';
    li.setAttribute('aria-label', `Task ${t + 1} ${ok ? 'solved' : 'failed'}`);
  });
  $('#runRead').innerHTML = union ? `Any of three runs: <b>${n}/50</b> tasks. One run averages 36/50.` : `Run ${k + 1}: <b>${n}/50</b> tasks solved.`;
  press($$('#runSeg button'), (b) => Number(b.dataset.run) === k);
}
$$('#runSeg button').forEach((b) => b.addEventListener('click', () => drawRuns(Number(b.dataset.run))));
drawRuns(3);

/* ---------------- method schematic ---------------- */
const mSvg = $('#mSvg');
const S = [70, 300], G = [568, 78];
const WALL = { x: 286, y: 96, w: 38, h: 264 };
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
const rand = rng(7);
const CANDS = Array.from({ length: 9 }, (_, i) => {
  const a = -1 + (2 * i) / 8;
  const end = [G[0] - 30 + 120 * (rand() - 0.5) + 30 * a, G[1] + 30 + 120 * (rand() - 0.4) - 25 * a];
  const c1 = [160 + 70 * rand(), 300 - 210 * (0.2 + 0.8 * ((a + 1) / 2)) - 40 * rand()];
  const c2 = [330 + 120 * rand(), 120 + 170 * (1 - (a + 1) / 2) + 40 * (rand() - 0.5)];
  return { p0: [c1, c2, end] };
});
function bez(p, t) {
  const [c1, c2, e] = p, u = 1 - t;
  return [0, 1].map((k) => u * u * u * S[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * e[k]);
}
function hitsWall(p) {
  for (let t = 0; t <= 1; t += 0.02) {
    const [px, py] = bez(p, t);
    if (px > WALL.x - 4 && px < WALL.x + WALL.w + 4 && py > WALL.y - 4) return true;
  }
  return false;
}
for (const c of CANDS) {
  const [c1, c2, e] = c.p0;
  // anchored polish: small move of the end toward the goal and of the bend away from the wall
  const lift = hitsWall(c.p0) ? -34 : -6;
  c.p1 = [[c1[0], c1[1] + lift * 0.6], [c2[0], c2[1] + lift], [e[0] + 0.28 * (G[0] - e[0]), e[1] + 0.28 * (G[1] - e[1])]];
  c.score = Math.hypot(c.p1[2][0] - G[0], c.p1[2][1] - G[1]) + (hitsWall(c.p1) ? 200 : 0);
}
const bestIdx = CANDS.reduce((b, c, i) => (c.score < CANDS[b].score ? i : b), 0);
const pathD = (p) => `M${S} C${p[0]} ${p[1]} ${p[2]}`;
// static layer
svg(mSvg, 'rect', { x: 0, y: 0, width: 640, height: 360, rx: 10, fill: '#F3F1EA' });
for (let gx = 40; gx < 640; gx += 40) svg(mSvg, 'line', { x1: gx, x2: gx, y1: 0, y2: 360, stroke: '#E8E5DB' });
for (let gy = 40; gy < 360; gy += 40) svg(mSvg, 'line', { x1: 0, x2: 640, y1: gy, y2: gy, stroke: '#E8E5DB' });
svg(mSvg, 'rect', { x: WALL.x, y: WALL.y, width: WALL.w, height: WALL.h, fill: '#2C3531', rx: 2 });
svg(mSvg, 'text', { x: WALL.x + WALL.w / 2, y: WALL.y + 110, 'text-anchor': 'middle', fill: '#F3F1EA', 'font-size': 12, transform: `rotate(-90 ${WALL.x + WALL.w / 2} ${WALL.y + 110})` }, 'wall');
const ghostG = svg(mSvg, 'g');
const pathG = svg(mSvg, 'g');
const dotG = svg(mSvg, 'g');
const execP = svg(mSvg, 'path', { fill: 'none', stroke: C.ink, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0 });
svg(mSvg, 'circle', { cx: S[0], cy: S[1], r: 9, fill: C.ink });
svg(mSvg, 'text', { x: S[0], y: S[1] + 30, 'text-anchor': 'middle', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, 'agent');
svg(mSvg, 'path', { d: star(G[0], G[1], 13, 6), fill: '#E0A526', stroke: C.ink, 'stroke-width': 1.2 });
svg(mSvg, 'text', { x: G[0], y: G[1] - 22, 'text-anchor': 'middle', 'font-size': 13, fill: C.ink, 'font-weight': 600 }, 'goal');
function star(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1); }
  return d + 'Z';
}
const paths = CANDS.map((c) => svg(pathG, 'path', { d: pathD(c.p0), fill: 'none', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
const ghosts = CANDS.map((c) => svg(ghostG, 'path', { d: pathD(c.p0), fill: 'none', stroke: C.hj, 'stroke-width': 1.2, 'stroke-dasharray': '3 4', opacity: 0 }));
const ends = CANDS.map((c) => svg(dotG, 'circle', { cx: c.p0[2][0], cy: c.p0[2][1], r: 4.5 }));
const scoreT = CANDS.map(() => svg(dotG, 'text', { 'font-size': 11, 'font-weight': 600, opacity: 0 }));
const PH = [
  ['Propose', 'A flow head samples many goal-directed plans in one shot. It learned them from reward-free trajectories. No gradients flow through the world model here.'],
  ['Polish (optional)', 'A few gradient steps nudge each plan, anchored so it stays close to its proposal. Two to five steps capture the early gain, before search starts chasing the model.'],
  ['Select', 'The frozen world model rolls every plan forward and scores how close it predicts each ends to the goal. The best plan runs for a short window, then the agent replans.'],
];
let phase = 0, anim = 0;
function tweenPaths(from, to, ms) {
  cancelAnimationFrame(anim);
  const t0 = performance.now();
  const step = (now) => {
    const k = reduced ? 1 : Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    CANDS.forEach((c, i) => {
      const p = c[from].map((pt, j) => pt.map((v, d) => v + (c[to][j][d] - v) * e));
      paths[i].setAttribute('d', pathD(p));
      ends[i].setAttribute('cx', p[2][0]); ends[i].setAttribute('cy', p[2][1]);
    });
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}
function setPhase(p) {
  const prev = phase; phase = p;
  $('#mStage').textContent = PH[p][0];
  $('#mBody').textContent = PH[p][1];
  press($$('#mSeg button[data-ph]'), (b) => Number(b.dataset.ph) === p);
  const shape = p === 0 ? 'p0' : 'p1';
  const prevShape = prev === 0 ? 'p0' : 'p1';
  if (shape !== prevShape) tweenPaths(prevShape, shape, 700);
  else CANDS.forEach((c, i) => { paths[i].setAttribute('d', pathD(c[shape])); ends[i].setAttribute('cx', c[shape][2][0]); ends[i].setAttribute('cy', c[shape][2][1]); });
  ghosts.forEach((g) => g.setAttribute('opacity', p >= 1 ? 0.7 : 0));
  CANDS.forEach((c, i) => {
    const best = i === bestIdx, sel = p === 2;
    paths[i].setAttribute('stroke', sel ? (best ? C.cj : '#B8BEC4') : C.cj);
    paths[i].setAttribute('stroke-width', sel && best ? 3.6 : 2.2);
    paths[i].setAttribute('opacity', sel && !best ? 0.55 : 0.85);
    ends[i].setAttribute('fill', sel ? (best ? C.cj : '#B8BEC4') : C.cj);
    ends[i].setAttribute('r', sel && best ? 6.5 : 4.5);
    const t = scoreT[i];
    const e = c.p1[2];
    t.setAttribute('x', e[0] - 10); t.setAttribute('y', e[1] + 20); t.setAttribute('text-anchor', 'end');
    t.setAttribute('fill', best ? C.cj : C.muted);
    t.textContent = best ? 'best predicted outcome' : '';
    t.setAttribute('opacity', sel && best ? 1 : 0);
  });
  if (p === 2) {
    const b = CANDS[bestIdx].p1, pts = [];
    for (let t = 0; t <= 0.3; t += 0.02) pts.push(bez(b, t));
    execP.setAttribute('d', 'M' + pts.map((q) => q.join(',')).join('L'));
    execP.setAttribute('opacity', 0.9);
  } else execP.setAttribute('opacity', 0);
}
$$('#mSeg button[data-ph]').forEach((b) => b.addEventListener('click', () => { stopPlay(); setPhase(Number(b.dataset.ph)); }));
let playTimer = 0;
function stopPlay() { clearTimeout(playTimer); playTimer = 0; $('#mPlay').textContent = '▶ Play'; }
$('#mPlay').addEventListener('click', () => {
  if (playTimer) return stopPlay();
  $('#mPlay').textContent = '❚❚ Pause';
  const run = (p) => { setPhase(p); playTimer = setTimeout(() => run((p + 1) % 3), p === 2 ? 3200 : 2200); };
  run(0);
});
setPhase(0);

/* ---------------- results: AntMaze scatter ---------------- */
const PTS = [
  { n: 'H-JEPA', x: 131.0, y: 67.6, k: 'hj' },
  { n: 'Single proposal', x: 0.25, y: 44.7, k: 'sp' },
  { n: 'CriticJEPA-0, small pool', x: 0.36, y: 68.7, k: 'c0', f: 1 },
  { n: 'CriticJEPA-0', x: 1.62, y: 78.7, k: 'c0', f: 1 },
  { n: 'K=2', x: 2.51, y: 88.2, k: 'cx', f: 1 },
  { n: 'CriticJEPA-5', x: 5.11, y: 89.1, k: 'c5', f: 1 },
  { n: 'K=5, larger pool', x: 9.97, y: 90.9, k: 'cx', f: 1 },
];
const sc = $('#scatter');
function drawScatter() {
  const W = Math.max(300, sc.parentElement.clientWidth - 2), H = W > 520 ? 330 : 280;
  const L = 36, R = W - 16, T = 16, B = H - 40;
  const lx = (v) => L + ((R - L) * (Math.log10(v) - Math.log10(0.15))) / (Math.log10(300) - Math.log10(0.15));
  const ly = (v) => B - ((B - T) * (v - 40)) / (95 - 40);
  sc.setAttribute('viewBox', `0 0 ${W} ${H}`);
  sc.querySelectorAll(':not(title)').forEach((n) => n.remove());
  for (const v of [40, 50, 60, 70, 80, 90]) { svg(sc, 'line', { x1: L, x2: R, y1: ly(v), y2: ly(v), stroke: C.rule }); svg(sc, 'text', { x: L - 7, y: ly(v) + 4, 'text-anchor': 'end' }, v); }
  for (const v of [0.3, 1, 3, 10, 30, 100]) svg(sc, 'text', { x: lx(v), y: B + 18, 'text-anchor': 'middle' }, v);
  svg(sc, 'text', { x: (L + R) / 2, y: H - 4, 'text-anchor': 'middle' }, 'Planning TFLOPs per episode (log)');
  svg(sc, 'text', { x: L, y: T - 4 }, 'Success %');
  // H-JEPA level
  svg(sc, 'line', { x1: lx(0.36), x2: lx(131), y1: ly(67.6), y2: ly(67.6), stroke: C.hj, 'stroke-dasharray': '3 4' });
  // frontier
  const fr = PTS.filter((p) => p.f).sort((a, b) => a.x - b.x);
  svg(sc, 'polyline', { points: fr.map((p) => `${lx(p.x)},${ly(p.y)}`).join(' '), fill: 'none', stroke: C.cj, 'stroke-width': 2, opacity: 0.45 });
  // arrow H-JEPA -> CJ-5
  const a = PTS[0], b = PTS[5];
  const defs = svg(sc, 'defs');
  const mk = svg(defs, 'marker', { id: 'ah', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  svg(mk, 'path', { d: 'M0,0L10,5L0,10z', fill: C.cj });
  const ax0 = lx(a.x) - 10, ay0 = ly(a.y) - 6, ax1 = lx(b.x) + 12, ay1 = ly(b.y) + 4;
  svg(sc, 'line', { x1: ax0, y1: ay0, x2: ax1, y2: ay1, stroke: C.cj, 'stroke-width': 1.6, 'marker-end': 'url(#ah)' });
  const ang = (Math.atan2(ay1 - ay0, ax1 - ax0) * 180) / Math.PI + 180;
  const mx = (ax0 + ax1) / 2, my = (ay0 + ay1) / 2;
  svg(sc, 'text', { x: mx, y: my - 8, 'text-anchor': 'middle', transform: `rotate(${ang} ${mx} ${my})`, style: `fill:${C.cj};font-weight:700;font-size:12.5px` }, '+21.5 pts, 26× less compute');
  for (const p of PTS) {
    const cx = lx(p.x), cy = ly(p.y);
    const st = { hj: [C.hj, C.hj], sp: [C.paper, C.hj], c0: [C.paper, C.cj], cx: [C.cjSoft, C.cj], c5: [C.cj, C.cj] }[p.k];
    svg(sc, 'circle', { cx, cy, r: p.k === 'c5' || p.k === 'hj' ? 7 : 5.5, fill: st[0], stroke: st[1], 'stroke-width': 2.2 });
  }
  const lab = (p, dx, dy, anchor, bold) => svg(sc, 'text', { x: lx(p.x) + dx, y: ly(p.y) + dy, 'text-anchor': anchor, class: bold ? 'strong' : '' }, `${p.n} ${p.y}`);
  lab(PTS[0], 0, 22, 'middle', true);
  lab(PTS[1], 10, 4, 'start');
  lab(PTS[2], 8, 18, 'start');
  lab(PTS[3], 10, 16, 'start');
  lab(PTS[5], -10, -12, 'end', true);
  svg(sc, 'text', { x: lx(0.36) + 8, y: ly(68.7) + 32, style: 'font-size:11px' }, '≈ H-JEPA at 1/360 compute');
}

/* ---------------- results: K sweep ---------------- */
const KS = [0, 2, 5, 10, 20], KV = [84.0, 94.7, 93.3, 91.3, 90.7];
const kc = $('#kChart');
function drawK() {
  const W = Math.max(280, kc.parentElement.clientWidth - 2), H = W > 420 ? 330 : 260;
  const L = 34, R = W - 18, T = 26, B = H - 40;
  const x = (k) => L + ((R - L) * k) / 20, y = (v) => B - ((B - T) * (v - 65)) / 35;
  kc.setAttribute('viewBox', `0 0 ${W} ${H}`);
  kc.querySelectorAll(':not(title)').forEach((n) => n.remove());
  for (const v of [70, 80, 90, 100]) { svg(kc, 'line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: C.rule }); svg(kc, 'text', { x: L - 7, y: y(v) + 4, 'text-anchor': 'end' }, v); }
  KS.forEach((k) => svg(kc, 'text', { x: x(k), y: B + 18, 'text-anchor': 'middle' }, k));
  svg(kc, 'text', { x: (L + R) / 2, y: H - 4, 'text-anchor': 'middle' }, 'Anchored polish steps K');
  svg(kc, 'text', { x: L, y: T - 10 }, 'Success %');
  svg(kc, 'line', { x1: L, x2: R, y1: y(72), y2: y(72), stroke: C.hj, 'stroke-dasharray': '5 4', 'stroke-width': 1.6 });
  svg(kc, 'text', { x: R, y: y(72) + 16, 'text-anchor': 'end', style: `fill:${C.hj};font-weight:600` }, 'H-JEPA 72.0');
  svg(kc, 'polyline', { points: KS.map((k, i) => `${x(k)},${y(KV[i])}`).join(' '), fill: 'none', stroke: C.cj, 'stroke-width': 2.6 });
  KS.forEach((k, i) => {
    svg(kc, 'circle', { cx: x(k), cy: y(KV[i]), r: i === 1 ? 6.5 : 4.5, fill: i === 1 ? C.cj : C.paper, stroke: C.cj, 'stroke-width': 2.2 });
    svg(kc, 'text', { x: x(k), y: y(KV[i]) + (i === 0 ? 20 : -12), 'text-anchor': i === 4 ? 'end' : 'middle', class: i === 1 ? 'strong' : '' }, KV[i].toFixed(1));
  });
}

/* ---------------- results: dumbbell ---------------- */
const ROWS = [
  ['Visual AntMaze', 'three levels', 67.6, 78.7, 89.1, 26],
  ['Push-T', 'two levels', 43.3, 52.0, 57.3, 79],
  ['Push-T', 'three levels', 9.3, 18.7, 22.7, 13],
  ['Cube', 'two levels', 49.3, 100, 92.0, 44],
  ['Cube', 'three levels', 48.7, 100, 100, 50],
  ['FourRoom', 'three levels', 96.0, 100, 100, 14],
];
const db = $('#dumbbell');
function drawDumb() {
  db.replaceChildren();
  const mk = (cls) => { const d = document.createElement('div'); d.className = cls; db.append(d); return d; };
  const axis = mk('drow axis');
  axis.innerHTML = '<span></span>';
  const as = document.createElementNS(NS, 'svg'); axis.append(as); axis.append(document.createElement('span'));
  const w = () => as.getBoundingClientRect().width || 400;
  const rows = ROWS.map((r) => {
    const row = mk('drow');
    row.innerHTML = `<div class="env">${r[0]}<small>${r[1]}</small></div>`;
    const s = document.createElementNS(NS, 'svg'); row.append(s);
    const ratio = document.createElement('div'); ratio.className = 'ratio'; ratio.textContent = `${r[5]}×`; row.append(ratio);
    return [r, s];
  });
  const W = w();
  const x = (v) => 6 + ((W - 12) * v) / 100;
  as.setAttribute('viewBox', `0 0 ${W} 20`); as.style.height = '20px';
  for (const v of [0, 25, 50, 75, 100]) svg(as, 'text', { x: x(v), y: 14, 'text-anchor': v === 0 ? 'start' : v === 100 ? 'end' : 'middle' }, v + '%');
  for (const [r, s] of rows) {
    s.setAttribute('viewBox', `0 0 ${W} 52`);
    for (const v of [0, 25, 50, 75, 100]) svg(s, 'line', { x1: x(v), x2: x(v), y1: 14, y2: 34, stroke: '#ECE9E0' });
    const [, , h, c0, c5] = r;
    const lo = Math.min(h, c0, c5), hi = Math.max(h, c0, c5);
    svg(s, 'line', { x1: x(lo), x2: x(hi), y1: 26, y2: 26, stroke: C.cjSoft, 'stroke-width': 4, 'stroke-linecap': 'round' });
    svg(s, 'circle', { cx: x(h), cy: 26, r: 6, fill: C.hj });
    svg(s, 'circle', { cx: x(c0), cy: 26, r: 7.5, fill: '#fff', stroke: C.cj, 'stroke-width': 2.5 });
    svg(s, 'circle', { cx: x(c5), cy: 26, r: 5, fill: C.cj });
    const f = (v) => (v % 1 ? v.toFixed(1) : String(v));
    const edge = (v) => (v > 96 ? 'end' : 'middle'), nx = (v) => x(v) + (v > 96 ? 8 : 0);
    svg(s, 'text', { x: x(h) - (hi - h < 12 ? 10 : 0), y: hi - h < 12 ? 46 : 11, 'text-anchor': hi - h < 12 ? 'end' : 'middle' }, f(h));
    svg(s, 'text', { x: nx(c5), y: 11, 'text-anchor': edge(c5), style: `fill:${C.cj};font-weight:700` }, c0 === c5 ? `${f(c5)} (both)` : f(c5));
    if (c0 !== c5) svg(s, 'text', { x: nx(c0), y: 46, 'text-anchor': edge(c0), style: `fill:${C.cj}` }, f(c0));
  }
}

/* ---------------- bib ---------------- */
$('#copyBib').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#bibtex').textContent); $('#copyBib').textContent = 'Copied'; }
  catch { const r = document.createRange(); r.selectNodeContents($('#bibtex')); getSelection().removeAllRanges(); getSelection().addRange(r); $('#copyBib').textContent = 'Press Ctrl+C'; }
  setTimeout(() => ($('#copyBib').textContent = 'Copy'), 1800);
});

/* ---------------- layout ---------------- */
function drawAll() { drawDiag(); drawScatter(); drawK(); drawDumb(); }
let rz = 0;
addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(drawAll); });
drawAll();
