const steps = [0, 10, 30, 90];
const executed = [25.282, 23.045, 22.818, 23.406];
const predicted = [16.652, 9.503, 7.127, 6.718];
const forwardSelectionError = 20.209;
const chart = document.getElementById('diagChart');
const diagnosisReadout = document.getElementById('diagRead');
const stepButtons = [...document.querySelectorAll('[data-step]')];
const namespace = 'http://www.w3.org/2000/svg';
let selectedStep = 3;

function addGraphic(parent, tag, attributes, text) {
  const element = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  parent.append(element);
}

function drawDiagnosis() {
  const width = Math.max(248, chart.parentElement.clientWidth);
  const height = width > 500 ? 350 : 285;
  const left = 35;
  const right = width - 15;
  const top = 41;
  const bottom = height - 51;
  const x = (index) => left + (right - left) * steps[index] / 90;
  const y = (error) => bottom - (bottom - top) * error / 30;
  chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
  chart.querySelector('g')?.remove();
  const layer = document.createElementNS(namespace, 'g');
  chart.append(layer);

  for (const value of [0, 10, 20, 30]) {
    addGraphic(layer, 'line', { x1: left, x2: right, y1: y(value), y2: y(value), stroke: '#d2dfd6' });
    addGraphic(layer, 'text', { x: left - 8, y: y(value) + 4, 'text-anchor': 'end' }, value);
  }
  for (const [index, iteration] of steps.entries()) {
    addGraphic(layer, 'text', { x: x(index), y: bottom + 20, 'text-anchor': 'middle' }, iteration);
  }
  addGraphic(layer, 'text', { x: (left + right) / 2, y: height - 8, 'text-anchor': 'middle' }, 'Gradient steps');
  addGraphic(layer, 'text', { x: left, y: 20 }, 'Endpoint error ↓');

  const refY = y(forwardSelectionError);
  addGraphic(layer, 'line', { x1: left, x2: right, y1: refY, y2: refY, stroke: '#126d60', 'stroke-dasharray': '5 5' });
  addGraphic(layer, 'text', { x: right, y: refY + 17, 'text-anchor': 'end', style: 'fill:#126d60' }, 'CriticJEPA-0 · 20.2');
  addGraphic(layer, 'line', { x1: x(selectedStep), x2: x(selectedStep), y1: y(executed[selectedStep]), y2: y(predicted[selectedStep]), stroke: '#6e8077', 'stroke-dasharray': '2 4' });

  const series = [
    { label: 'Executed', values: executed, color: '#55647a', offset: -10 },
    { label: 'Predicted', values: predicted, color: '#b14835', offset: 20 },
  ];
  for (const line of series) {
    const points = line.values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
    addGraphic(layer, 'polyline', { points, fill: 'none', stroke: line.color, 'stroke-width': 2.5 });
    line.values.forEach((value, index) => {
      const active = index === selectedStep;
      addGraphic(layer, 'circle', { cx: x(index), cy: y(value), r: active ? 5.8 : 3.7, fill: active ? line.color : '#fffefa', stroke: line.color, 'stroke-width': 2.3 });
    });
    const alignLeft = selectedStep === steps.length - 1;
    addGraphic(layer, 'text', {
      x: x(selectedStep) + (alignLeft ? -9 : 9),
      y: y(line.values[selectedStep]) + line.offset,
      'text-anchor': alignLeft ? 'end' : 'start',
      style: `fill:${line.color};font-weight:600`,
    }, `${line.label} ${line.values[selectedStep].toFixed(1)}`);
  }

  diagnosisReadout.innerHTML = `Executed <b>${executed[selectedStep].toFixed(1)}</b> · Predicted <b>${predicted[selectedStep].toFixed(1)}</b>`;
  for (const button of stepButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.step) === selectedStep));
}

for (const button of stepButtons) {
  button.addEventListener('click', () => {
    selectedStep = Number(button.dataset.step);
    drawDiagnosis();
  });
}
window.addEventListener('resize', drawDiagnosis);
drawDiagnosis();

const restarts = [
  '01111101111111001101000101101001110011111111011101',
  '11010111011011111111100111111011111011111111011101',
  '11011111111110111101110011110000010111011111011000',
];
const grid = document.getElementById('grid');
const runReadout = document.getElementById('runRead');
const runButtons = [...document.querySelectorAll('[data-run]')];

function showRestart(index) {
  const union = index === restarts.length;
  const outcomes = Array.from({ length: 50 }, (_, task) => union ? restarts.some((run) => run[task] === '1') : restarts[index][task] === '1');
  const cells = outcomes.map((solved, task) => {
    const cell = document.createElement('li');
    const label = `Task ${task + 1} ${solved ? 'solved' : 'failed'}`;
    cell.className = solved ? 's' : 'f';
    cell.textContent = solved ? '' : '×';
    cell.title = label;
    cell.setAttribute('aria-label', label);
    return cell;
  });
  grid.replaceChildren(...cells);
  const solved = outcomes.filter(Boolean).length;
  runReadout.textContent = union ? `${solved}/50 tasks covered across three runs` : `Run ${index + 1} · ${solved}/50 tasks solved`;
  for (const button of runButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.run) === index));
}

for (const button of runButtons) button.addEventListener('click', () => showRestart(Number(button.dataset.run)));
showRestart(restarts.length);
