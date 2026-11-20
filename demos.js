// Recorded rollouts. Left half: H-JEPA. Right half: CriticJEPA. One video frame per environment step.
const mazeClip = (k, hit, hjHit, label, overlay) => ({ src: `assets/maze/maze-${k}.mp4`, poster: `assets/maze/maze-${k}-poster.jpg`, fps: 30, budget: 350, hit, hjHit, label, overlay });
window.MAZE_DEMOS = [
  mazeClip('a', 261, null, 'around the wall', 'benchmark task'),
  mazeClip('b', 233, null, 'past the block', 'benchmark task'),
  mazeClip('c', 130, null, 'up the corridor', 'benchmark task'),
  mazeClip('d', 68, 320, 'unseen task', 'unseen task'),
];
const moreClip = (id, fps, budget, hit) => ({ src: `assets/clips/${id}.mp4`, poster: `assets/clips/${id}-poster.jpg`, goal: `assets/clips/${id}-goal.png`, fps, budget, hit });
window.MORE_DEMOS = [
  { ...moreClip('pusht-024', 15, 90, 75), title: 'Push-T', caption: 'Push the T onto its outline within 90 steps. Contact-rich and unforgiving.' },
  { ...moreClip('cube-009', 8, 30, 14), title: 'Cube', caption: 'Reach, grasp and move the cube to the goal pose within 30 steps.' },
  { ...moreClip('pusht-015', 15, 90, 83), title: 'Push-T, another start', caption: 'Same frozen model, same settings, a different start.' },
  { ...moreClip('cube-030', 8, 30, 16), title: 'Cube, another start', caption: 'Same frozen model, same settings, a different start.' },
];
