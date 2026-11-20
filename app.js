'use strict';
const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const C = { ink: '#0B0B0C', text: '#1C1C1E', rule: '#DDDDD7', cj: '#18794E', cjSoft: '#CDE6D8', hj: '#C4502A', hjSoft: '#F6DED4', gray: '#8E8B83', gold: '#D49A0A', soft: '#F5F5F2', wall: '#2A2A2C' };
function svg(parent, tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  parent.append(el); return el;
}
const press = (bs, f) => bs.forEach((b) => b.setAttribute('aria-pressed', String(f(b))));
const clear = (el) => el.querySelectorAll(':scope > :not(title)').forEach((n) => n.remove());
const useIcon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

/* nav */
const nav = $('.nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
const navLinks = $$('.nav nav a');
const navIO = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && navLinks.forEach((a) => a.classList.toggle('on', a.hash === '#' + e.target.id))), { rootMargin: '-40% 0px -55% 0px' });
['demo', 'results', 'insight', 'method', 'gallery', 'cite'].forEach((id) => navIO.observe(document.getElementById(id)));

/* ================= synced comparison player ================= */
// Each video: left half H-JEPA, right half CriticJEPA, one frame per environment step, then a short hold.
class Player {
  constructor(root) {
    this.root = root; this.v = $('video', root); this.sl = $('.st.l', root); this.sr = $('.st.r', root);
    this.range = $('input', root); this.out = $('.step', root); this.hitEl = $('.hit', root); this.btn = $('.pp', root);
    this.userPaused = false; this.last = -1; this.d = null; this.v.loop = true;
    this.v.addEventListener('play', () => { this.icon(true); this.tick(); });
    this.v.addEventListener('pause', () => this.icon(false));
    ['seeked', 'timeupdate', 'loadeddata'].forEach((e) => this.v.addEventListener(e, () => this.render()));
    this.btn?.addEventListener('click', () => { if (this.v.paused) { this.userPaused = false; this.v.play().catch(() => {}); } else { this.userPaused = true; this.v.pause(); } });
    this.range?.addEventListener('input', () => {
      this.userPaused = true; this.v.pause();
      this.v.currentTime = Math.min((Number(this.range.value) + 0.5) / this.d.fps, (this.v.duration || 1e9) - 0.02);
      this.last = -1; this.render();
    });
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (e.isIntersecting && !reduced && !this.userPaused && !Player.allPaused) this.v.play().catch(() => {});
      if (!e.isIntersecting) this.v.pause();
    }, { threshold: 0.4 });
    this.io.observe(root);
  }
  icon(p) { if (this.btn) { $('use', this.btn).setAttribute('href', p ? '#i-pause' : '#i-play'); this.btn.setAttribute('aria-label', p ? 'Pause' : 'Play'); } }
  load(d, play) {
    this.d = d; this.last = -1;
    this.v.poster = d.poster; this.v.src = d.src; this.v.currentTime = 0;
    if (this.range) { this.range.max = d.budget; this.hitEl.style.left = `calc(8px + (100% - 16px) * ${d.hit / d.budget})`; }
    this.render();
    if (play && !reduced) this.v.play().catch(() => {});
  }
  tick() { this.render(); if (!this.v.paused) requestAnimationFrame(() => this.tick()); }
  render() {
    if (!this.d) return;
    const d = this.d, s = Math.min(d.budget, Math.floor(this.v.currentTime * d.fps + 1e-3));
    if (s === this.last) return; this.last = s;
    if (this.range) { this.range.value = s; this.range.style.setProperty('--p', `${(100 * s) / d.budget}%`); }
    if (this.out) this.out.textContent = `Step ${s} / ${d.budget}`;
    const hjWin = d.hjHit && s >= d.hjHit, lose = !d.hjHit && s >= d.budget, win = s >= d.hit;
    this.sl.className = 'st l' + (lose ? ' lose' : hjWin ? ' win' : '');
    this.sl.textContent = lose ? `✕ Missed in ${d.budget} steps` : hjWin ? `✓ Reached at step ${d.hjHit}` : 'Planning…';
    this.sr.className = 'st r' + (win ? ' win' : '');
    this.sr.textContent = win ? `✓ Reached at step ${d.hit}` : 'Planning…';
  }
}

/* ================= hero AntMaze ================= */
const G = window.GALLERY || {};
const MAZE = (G.maze || []).slice(0, 4);
const maze = new Player($('#mazePlayer'));
const cards = $('#mazeCards');
MAZE.forEach((d, i) => {
  const b = document.createElement('button');
  b.className = 'card'; b.dataset.i = i;
  b.innerHTML = `<img src="${d.poster}" alt=""><span><b>${d.title}</b><span>${d.short}</span></span>`;
  b.addEventListener('click', () => { maze.userPaused = false; maze.load(d, true); press($$('.card', cards), (x) => x === b); });
  cards.append(b);
});
if (MAZE.length) { maze.load(MAZE[0], false); press($$('.card', cards), (x) => x.dataset.i === '0'); }

/* ================= gallery ================= */
const ENVS = [['maze', 'AntMaze', 'i-maze'], ['pusht', 'Push-T', 'i-pusht'], ['cube', 'Cube', 'i-cube'], ['fourroom', 'FourRoom', 'i-rooms']].filter(([k]) => (G[k] || []).length);
const tabs = $('#envTabs'), track = $('#carTrack');
let galleryPlayers = [];
function showEnv(k) {
  galleryPlayers.forEach((p) => { p.v.pause(); p.io.disconnect(); });
  track.replaceChildren(); galleryPlayers = [];
  const env = ENVS.find((e) => e[0] === k);
  $('#carTitle').textContent = env[1];
  for (const d of (k === 'maze' ? G[k].slice(4) : G[k])) {
    const f = document.createElement('figure');
    f.className = 'gcard' + (k === 'maze' ? ' maze' : '');
    f.innerHTML = `<div class="media"><div class="vid"><video muted playsinline preload="metadata"></video><span class="tag l">H-JEPA</span><span class="tag r g">CriticJEPA</span><span class="st l"></span><span class="st r"></span>${d.goal ? `<figure class="goalchip"><img src="${d.goal}" alt="Goal observation"><figcaption>Goal</figcaption></figure>` : ''}</div></div><figcaption><b>${d.title}</b>${d.caption}</figcaption>`;
    track.append(f);
    const p = new Player(f); p.load(d, false); galleryPlayers.push(p);
  }
  track.scrollTo({ left: 0 });
  $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === k)));
}
for (const [k, label, icon] of ENVS) {
  const b = document.createElement('button');
  b.setAttribute('role', 'tab'); b.dataset.k = k; b.innerHTML = `${useIcon(icon)}${label}`;
  b.addEventListener('click', () => showEnv(k)); tabs.append(b);
}
if (ENVS.length) showEnv(ENVS[0][0]);
const step = () => ($('.gcard', track)?.getBoundingClientRect().width || 500) + 20;
$('#carPrev').addEventListener('click', () => track.scrollBy({ left: -step() }));
$('#carNext').addEventListener('click', () => track.scrollBy({ left: step() }));
$('#carPause').addEventListener('click', () => {
  Player.allPaused = !Player.allPaused;
  $('use', $('#carPause')).setAttribute('href', Player.allPaused ? '#i-play' : '#i-pause');
  galleryPlayers.forEach((p) => (Player.allPaused ? p.v.pause() : p.visible && p.v.play().catch(() => {})));
});

/* ================= 1 restarts ================= */
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
  b.innerHTML = `<span>${RUN_LABELS[k]}</span><span class="rt"><i style="width:${(100 * n) / 50}%"></i></span><span class="rn">${2 * n}%</span>`;
  b.addEventListener('click', () => drawRuns(k)); runSeg.append(b);
});
const runNote = document.createElement('p'); runNote.className = 'runnote';
runNote.innerHTML = `One run: <b>${Math.round((2 * (counts[0] + counts[1] + counts[2])) / 3)}%</b> on average.<br>All three together: <b>${2 * counts[3]}%</b>.`;
runSeg.append(runNote);
function drawRuns(k) {
  $$('li', grid).forEach((li, t) => { const ok = solvedBy(k, t); li.className = ok ? 's' : 'f'; li.setAttribute('aria-label', `Task ${t + 1} ${ok ? 'solved' : 'failed'}`); });
  $('#runRead').innerHTML = `${RUN_LABELS[k]}: <b>${counts[k]} of 50</b> tasks`;
  press($$('.runbar', runSeg), (b) => Number(b.dataset.run) === k);
}
drawRuns(3);

/* ================= 2 optimism ================= */
const STEPS = [0, 10, 30, 90], EXE = [25.282, 23.045, 22.818, 23.406], PRE = [16.652, 9.503, 7.127, 6.718], REF = 20.209;
let dSel = 3;
const diag = $('#diagChart');
function drawDiag() {
  const W = Math.max(300, diag.parentElement.clientWidth - 2), H = W > 560 ? 340 : 270;
  const L = 36, R = W - 12, T = 16, B = H - 42;
  const x = (i) => L + ((R - L) * STEPS[i]) / 90, y = (v) => B - ((B - T) * v) / 30;
  diag.setAttribute('viewBox', `0 0 ${W} ${H}`); clear(diag);
  for (const v of [0, 10, 20, 30]) { svg(diag, 'line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: C.rule }); svg(diag, 'text', { x: L - 10, y: y(v) + 5, 'text-anchor': 'end' }, v); }
  STEPS.forEach((s, i) => svg(diag, 'text', { x: x(i), y: B + 24, 'text-anchor': 'middle', class: i === dSel ? 'strong' : '' }, s));
  const up = [...Array(dSel + 1).keys()];
  svg(diag, 'polygon', { points: up.map((i) => `${x(i)},${y(EXE[i])}`).concat(up.slice().reverse().map((i) => `${x(i)},${y(PRE[i])}`)).join(' '), fill: C.hjSoft });
  svg(diag, 'line', { x1: L, x2: R, y1: y(REF), y2: y(REF), stroke: C.cj, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' });
  svg(diag, 'text', { x: L + 8, y: y(REF) - 9, style: `fill:${C.cj};font-weight:700` }, 'CriticJEPA-0 · 20.2');
  const all = [0, 1, 2, 3];
  svg(diag, 'polyline', { points: all.map((i) => `${x(i)},${y(EXE[i])}`).join(' '), fill: 'none', stroke: C.ink, 'stroke-width': 3 });
  svg(diag, 'polyline', { points: all.map((i) => `${x(i)},${y(PRE[i])}`).join(' '), fill: 'none', stroke: C.hj, 'stroke-width': 3, 'stroke-dasharray': '8 5' });
  all.forEach((i) => {
    const on = i === dSel;
    svg(diag, 'circle', { cx: x(i), cy: y(EXE[i]), r: on ? 7 : 4.5, fill: on ? C.ink : C.soft, stroke: C.ink, 'stroke-width': 2.5 });
    svg(diag, 'circle', { cx: x(i), cy: y(PRE[i]), r: on ? 7 : 4.5, fill: on ? C.hj : C.soft, stroke: C.hj, 'stroke-width': 2.5 });
  });
  svg(diag, 'text', { x: R, y: y(EXE[3]) - 14, 'text-anchor': 'end', class: 'strong' }, 'executed');
  svg(diag, 'text', { x: R, y: y(PRE[3]) + 26, 'text-anchor': 'end', style: `fill:${C.hj};font-weight:700` }, 'predicted');
  $('#roExe').textContent = EXE[dSel].toFixed(1); $('#roPre').textContent = PRE[dSel].toFixed(1); $('#roOpt').textContent = (EXE[dSel] - PRE[dSel]).toFixed(1);
  press($$('#diagSeg button'), (b) => Number(b.dataset.step) === dSel);
}
$$('#diagSeg button').forEach((b) => b.addEventListener('click', () => { dSel = Number(b.dataset.step); drawDiag(); }));

/* ================= 3 candidate sources ================= */
const SRC = [{ k: 'hj', n: 'Search outputs', s: 'H-JEPA, up to 90 steps' }, { k: 'rt', n: 'Retrieved plans', s: 'nearest training data' }, { k: 'cj', n: 'Flow proposals', s: 'goal-conditioned' }];
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
    const v = M.v[i], z = pos(Math.max(M.lo, 0)), p = pos(v), right = Math.max(z, p);
    Object.assign($('.fill', row).style, { left: `${Math.min(z, p)}%`, width: `${Math.abs(p - z)}%` });
    const lab = $('.v', row); lab.style.left = `${right}%`; lab.textContent = M.f(v); lab.classList.toggle('in', right > 66);
    Object.assign($('.zero', row).style, { display: M.zero ? '' : 'none', left: `${z}%` });
    const ch = $('.chance', row); ch.style.display = M.chance ? '' : 'none'; if (M.chance) ch.style.left = `${pos(M.chance)}%`; $('span', ch).style.display = i ? 'none' : '';
    row.classList.toggle('best', v === best);
  });
  press($$('#candSeg button'), (b) => b.dataset.m === m);
}
$$('#candSeg button').forEach((b) => b.addEventListener('click', () => drawCand(b.dataset.m)));
drawCand('rho');

/* ================= method schematic on the AntMaze layout ================= */
const LAYOUT = ['11111111', '10011001', '10010001', '11000111', '10010001', '10100101', '10001001', '11111111'].map((r) => [...r].map(Number));
const CS = 38, OX = 12, OY = 12, cc = (i, j) => [OX + j * CS + CS / 2, OY + i * CS + CS / 2];
const START = [6, 1], GOAL = [1, 6];
function bfsPath(a, b) {
  const key = (p) => p.join(','), prev = new Map([[key(a), null]]), q = [a];
  while (q.length) { const p = q.shift(); if (key(p) === key(b)) break; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [p[0] + di, p[1] + dj]; if (!LAYOUT[n[0]][n[1]] && !prev.has(key(n))) { prev.set(key(n), p); q.push(n); } } }
  const out = []; for (let p = b; p; p = prev.get(key(p))) out.unshift(p); return out;
}
const mSvg = $('#mSvg');
const inWall = (x, y) => LAYOUT[Math.floor((y - OY) / CS)]?.[Math.floor((x - OX) / CS)] === 1;
const smoothD = (pts) => { let d = `M${pts[0][0]},${pts[0][1]}`; for (let k = 1; k < pts.length - 1; k++) { const [a, b] = [pts[k], pts[k + 1]]; d += ` Q${a[0]},${a[1]} ${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}`; } const e = pts[pts.length - 1]; return d + ` L${e[0]},${e[1]}`; };
const OPT_PRED = [16.7, 9.5, 7.1, 6.7], OPT_EXE = [25.3, 23.0, 22.8, 23.4];
const corridor = bfsPath(START, GOAL).map(([i, j]) => cc(i, j));
const sample = (pts, n) => Array.from({ length: n }, (_, k) => pts[Math.round((k * (pts.length - 1)) / (n - 1))]);
const optStart = sample(corridor.slice(0, 7), 7).slice(1);
const s0 = cc(...START), g0 = cc(...GOAL);
const optEnd = Array.from({ length: 6 }, (_, k) => { const t = (k + 1) / 6; return [s0[0] + (g0[0] - s0[0]) * t, s0[1] + (g0[1] - s0[1]) * t]; });
const TARGETS = [[1, 6], [4, 6], [2, 4], [6, 3], [4, 1], [1, 1]];
const cands = TARGETS.map((t, n) => { const p = bfsPath(START, t).map(([i, j]) => cc(i, j)); const off = (n - 2.5) * 2.2; return p.slice(0, 9).map(([x, y]) => [x + off, y - off]); });
const candScore = cands.map((p) => bfsPath([Math.floor((p[p.length - 1][1] - OY) / CS), Math.floor((p[p.length - 1][0] - OX) / CS)], GOAL).length);
const bestC = candScore.indexOf(Math.min(...candScore));
let mMode = 'opt', mTimer = 0;
const PX = 352, PW = 290, T = (x, y, s, c, w = 600) => svg(mSvg, 'text', { x, y, style: `font-size:${s}px;font-weight:${w};fill:${c}` });
function base() {
  clear(mSvg);
  svg(mSvg, 'rect', { x: OX, y: OY, width: CS * 8, height: CS * 8, fill: '#fff', rx: 6 });
  LAYOUT.forEach((r, i) => r.forEach((w, j) => w && svg(mSvg, 'rect', { x: OX + j * CS, y: OY + i * CS, width: CS, height: CS, fill: C.wall })));
  svg(mSvg, 'circle', { cx: s0[0], cy: s0[1], r: 8, fill: C.ink });
  svg(mSvg, 'circle', { cx: g0[0], cy: g0[1], r: 10, fill: C.gold });
}
function drawOpt(k) {
  base();
  const t = k / 3, pts = optStart.map((p, n) => [p[0] + (optEnd[n][0] - p[0]) * t, p[1] + (optEnd[n][1] - p[1]) * t]);
  svg(mSvg, 'path', { d: smoothD([s0, ...pts]), fill: 'none', stroke: C.hj, 'stroke-width': 4, 'stroke-linecap': 'round' });
  pts.forEach(([x, y]) => { const bad = inWall(x, y); svg(mSvg, 'circle', { cx: x, cy: y, r: bad ? 8 : 6, fill: bad ? '#fff' : C.hj, stroke: C.hj, 'stroke-width': 3 }); });
  T(PX, 34, 18, C.ink, 700).textContent = `After ${STEPS[k]} gradient steps`;
  [['Predicted by the model', OPT_PRED[k], C.hj], ['Reached when executed', OPT_EXE[k], C.ink]].forEach(([lab, v, col], n) => {
    const y = 82 + n * 72;
    T(PX, y, 16, C.ink, 600).textContent = lab;
    svg(mSvg, 'rect', { x: PX, y: y + 12, width: (PW - 60) * (v / 26), height: 22, rx: 4, fill: col });
    T(PX + (PW - 60) * (v / 26) + 10, y + 29, 17, C.ink, 700).textContent = v.toFixed(1);
  });
  const nIn = pts.filter(([x, y]) => inWall(x, y)).length;
  T(PX, 250, 17, nIn ? C.hj : C.ink, 700).textContent = nIn ? `${nIn} subgoals now inside walls` : 'Subgoals follow the corridor';
  T(PX, 312, 15, C.text, 500).textContent = 'Errors measured. Path sketched.';
  $('#mHead').textContent = 'Optimize with gradients';
  $('#mBody').textContent = 'Each step pulls the imagined plan straight at the goal. The model likes it more and more, but the plan cuts through walls and the executed error barely moves.';
}
function drawSel(phase) {
  base();
  cands.forEach((p, n) => {
    const best = n === bestC, show = phase >= 1;
    if (!show) return;
    svg(mSvg, 'path', { d: smoothD(p), fill: 'none', stroke: phase === 2 ? (best ? C.cj : '#C4C4BD') : C.cj, 'stroke-width': phase === 2 && best ? 4.5 : 2.6, 'stroke-linecap': 'round', opacity: 0.9 });
    const e = p[p.length - 1];
    svg(mSvg, 'circle', { cx: e[0], cy: e[1], r: phase === 2 && best ? 7 : 5, fill: phase === 2 && !best ? '#C4C4BD' : C.cj });
  });
  T(PX, 34, 18, C.ink, 700).textContent = phase < 2 ? `${cands.length} proposals, one shot` : 'Predicted distance to goal';
  if (phase >= 1) cands.forEach((p, n) => {
    const y = 58 + n * 34, w = (PW - 80) * (candScore[n] / Math.max(...candScore)), best = n === bestC;
    svg(mSvg, 'rect', { x: PX, y, width: phase === 2 ? w : 0, height: 18, rx: 4, fill: best ? C.cj : '#C4C4BD' });
    T(PX + (phase === 2 ? w : 0) + 10, y + 15, 16, best ? C.cj : C.ink, 700).textContent = phase === 2 ? (best ? 'Chosen' : '') : `Plan ${n + 1}`;
  });
  T(PX, 312, 15, C.text, 500).textContent = 'Sketch.';
  $('#mHead').textContent = 'Propose, then select';
  $('#mBody').textContent = 'The proposer learned from real trajectories, so its plans follow the corridors. The frozen model only compares them and keeps the best. Its first part runs, then everything replans.';
}
function runMethod(mode) {
  clearTimeout(mTimer); mMode = mode; press($$('#mSeg [data-mode]'), (b) => b.dataset.mode === mode);
  const frames = mode === 'opt' ? [0, 1, 2, 3] : [0, 1, 2], draw = mode === 'opt' ? drawOpt : drawSel;
  if (reduced) return draw(frames[frames.length - 1]);
  let k = 0; const go = () => { draw(frames[k]); if (++k < frames.length) mTimer = setTimeout(go, 1200); }; go();
}
$$('#mSeg [data-mode]').forEach((b) => b.addEventListener('click', () => runMethod(b.dataset.mode)));
$('#mPlay').addEventListener('click', () => runMethod(mMode));
let mStarted = false;
new IntersectionObserver(([e]) => { if (e.isIntersecting && !mStarted) { mStarted = true; runMethod('opt'); } }, { threshold: 0.5 }).observe(mSvg);
drawOpt(0);

/* ================= results ================= */
const PTS = [
  { n: 'H-JEPA', x: 131.0, y: 67.6, k: 'hj' }, { n: 'Single proposal', x: 0.25, y: 44.7, k: 'sp' },
  { n: 'CriticJEPA-0, small pool', x: 0.36, y: 68.7, k: 'c0', f: 1 }, { n: 'CriticJEPA-0', x: 1.62, y: 78.7, k: 'c0', f: 1 },
  { n: 'K=2', x: 2.51, y: 88.2, k: 'cx', f: 1 }, { n: 'CriticJEPA-5', x: 5.11, y: 89.1, k: 'c5', f: 1 }, { n: 'Larger pool', x: 9.97, y: 90.9, k: 'cx', f: 1 },
];
const sc = $('#scatter');
function drawScatter() {
  const W = Math.max(300, sc.parentElement.clientWidth - 2), H = Math.round(W * 0.66);
  const L = 40, R = W - 14, Tp = 30, B = H - 46;
  const lx = (v) => L + ((R - L) * (Math.log10(v) - Math.log10(0.15))) / (Math.log10(300) - Math.log10(0.15)), ly = (v) => B - ((B - Tp) * (v - 40)) / 56;
  sc.setAttribute('viewBox', `0 0 ${W} ${H}`); clear(sc);
  for (const v of [40, 60, 80]) { svg(sc, 'line', { x1: L, x2: R, y1: ly(v), y2: ly(v), stroke: C.rule }); svg(sc, 'text', { x: L - 8, y: ly(v) + 5, 'text-anchor': 'end' }, v); }
  for (const v of [0.3, 1, 3, 10, 30, 100]) svg(sc, 'text', { x: lx(v), y: B + 22, 'text-anchor': 'middle' }, v);
  svg(sc, 'text', { x: R, y: H - 2, 'text-anchor': 'end', class: 'strong' }, 'TFLOPs per episode →');
  svg(sc, 'text', { x: L - 30, y: Tp - 12, class: 'strong' }, 'Success %');
  svg(sc, 'line', { x1: lx(0.36), x2: lx(131), y1: ly(67.6), y2: ly(67.6), stroke: C.hj, 'stroke-dasharray': '4 5', 'stroke-width': 1.6 });
  const fr = PTS.filter((p) => p.f).sort((a, b) => a.x - b.x);
  svg(sc, 'polyline', { points: fr.map((p) => `${lx(p.x)},${ly(p.y)}`).join(' '), fill: 'none', stroke: C.cj, 'stroke-width': 2.4 });
  for (const p of PTS) {
    const st = { hj: [C.hj, C.hj], sp: ['#fff', C.gray], c0: ['#fff', C.cj], cx: [C.cjSoft, C.cj], c5: [C.cj, C.cj] }[p.k];
    svg(sc, 'circle', { cx: lx(p.x), cy: ly(p.y), r: p.k === 'c5' || p.k === 'hj' ? 8 : 6, fill: st[0], stroke: st[1], 'stroke-width': 2.4 });
  }
  const lab = (p, dx, dy, a, cls, txt) => svg(sc, 'text', { x: lx(p.x) + dx, y: ly(p.y) + dy, 'text-anchor': a, class: cls || '' }, txt || `${p.n} ${p.y}`);
  lab(PTS[0], 0, 26, 'middle', 'strong'); lab(PTS[1], 12, 5, 'start'); lab(PTS[3], 12, 20, 'start'); lab(PTS[5], 0, -16, 'middle', 'strong');
  lab(PTS[2], 10, 22, 'start', '', 'Matches H-JEPA at 1/360 compute');
}
const KS = [0, 2, 5, 10, 20], KV = [84.0, 94.7, 93.3, 91.3, 90.7];
const kc = $('#kChart');
function drawK() {
  const W = Math.max(300, kc.parentElement.clientWidth - 2), H = Math.round(W * 0.66);
  const L = 40, R = W - 18, Tp = 30, B = H - 46;
  const x = (k) => L + ((R - L) * k) / 20, y = (v) => B - ((B - Tp) * (v - 65)) / 35;
  kc.setAttribute('viewBox', `0 0 ${W} ${H}`); clear(kc);
  for (const v of [70, 80, 90, 100]) { svg(kc, 'line', { x1: L, x2: R, y1: y(v), y2: y(v), stroke: C.rule }); svg(kc, 'text', { x: L - 8, y: y(v) + 5, 'text-anchor': 'end' }, v); }
  KS.forEach((k) => svg(kc, 'text', { x: x(k), y: B + 22, 'text-anchor': 'middle' }, k));
  svg(kc, 'text', { x: R, y: H - 2, 'text-anchor': 'end', class: 'strong' }, 'Polish steps K →');
  svg(kc, 'text', { x: L - 30, y: Tp - 12, class: 'strong' }, 'Success %');
  svg(kc, 'line', { x1: L, x2: R, y1: y(72), y2: y(72), stroke: C.hj, 'stroke-dasharray': '6 5', 'stroke-width': 2 });
  svg(kc, 'text', { x: R, y: y(72) + 22, 'text-anchor': 'end', style: `fill:${C.hj};font-weight:700` }, 'H-JEPA 72.0');
  svg(kc, 'polyline', { points: KS.map((k, i) => `${x(k)},${y(KV[i])}`).join(' '), fill: 'none', stroke: C.cj, 'stroke-width': 3 });
  KS.forEach((k, i) => {
    svg(kc, 'circle', { cx: x(k), cy: y(KV[i]), r: i === 1 ? 8 : 5.5, fill: i === 1 ? C.cj : '#fff', stroke: C.cj, 'stroke-width': 2.4 });
    svg(kc, 'text', { x: x(k), y: y(KV[i]) + (i === 0 ? 26 : -14), 'text-anchor': i === 4 ? 'end' : 'middle', class: i === 1 ? 'strong' : '' }, KV[i].toFixed(1));
  });
}
const ROWS = [['Visual AntMaze', 'three levels', 67.6, 89.1, 26], ['Push-T', 'two levels', 43.3, 57.3, 79], ['Push-T', 'three levels', 9.3, 22.7, 13], ['Cube', 'two levels', 49.3, 92.0, 44], ['Cube', 'three levels', 48.7, 100, 50], ['FourRoom', 'three levels', 96.0, 100, 14]];
const hb = $('#headBars');
function drawHead() {
  hb.replaceChildren();
  const f = (v) => (v % 1 ? v.toFixed(1) : String(v));
  for (const [env, lv, h, c, x] of ROWS) {
    const r = document.createElement('div'); r.className = 'hrow';
    r.innerHTML = `<div class="env">${env}<small>${lv}</small></div>
      <div class="pair"><div class="hb hj"><i style="--w:${h}%"></i><span>${f(h)}%</span></div><div class="hb c5"><i style="--w:${c}%"></i><span>${f(c)}%</span></div></div>
      <div class="xb"><svg><use href="#i-bolt"/></svg><b>${x}×</b><span>less</span></div>`;
    hb.append(r);
  }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { hb.classList.add('in'); io.disconnect(); } }, { threshold: 0.05 });
  if (reduced) hb.classList.add('in');
  io.observe(hb);
}
drawHead();

$('#copyBib').addEventListener('click', async () => {
  const b = $('#copyBib');
  try { await navigator.clipboard.writeText($('#bibtex').textContent); b.textContent = 'Copied'; } catch { b.textContent = 'Select to copy'; }
  setTimeout(() => (b.textContent = 'Copy'), 1600);
});
function drawAll() { drawDiag(); drawScatter(); drawK(); }
let rz = 0; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(drawAll); });
drawAll();
