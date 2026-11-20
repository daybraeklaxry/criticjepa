// Recorded rollouts. Left half: H-JEPA. Right half: CriticJEPA. One video frame per environment step.
(() => {
  const maze = (k, hit, hjHit, title, short, caption) => ({ src: `assets/maze/maze-${k}.mp4`, poster: `assets/maze/maze-${k}-poster.jpg`, fps: 30, budget: 350, hit, hjHit, title, short, caption });
  const clip = (id, fps, budget, hit, title, caption) => ({ src: `assets/clips/${id}.mp4`, poster: `assets/clips/${id}-poster.jpg`, goal: `assets/clips/${id}-goal.png`, fps, budget, hit, title, caption });
  window.GALLERY = {
    maze: [
      maze('a', 261, null, 'Around the wall', 'H-JEPA stalls at the start', 'CriticJEPA follows the corridor around the block and down to the goal.'),
      maze('b', 233, null, 'Past the block', 'H-JEPA wanders and runs out', 'CriticJEPA climbs past the block and turns left to the goal.'),
      maze('c', 130, null, 'Up the corridor', 'H-JEPA is stuck at a wall', 'CriticJEPA heads up the left corridor and reaches the goal in 130 steps.'),
      maze('d', 68, 320, 'Same goal, 5× sooner', 'Both arrive, 68 vs 320 steps', 'Both planners reach the goal. CriticJEPA gets there in 68 steps, H-JEPA in 320.'),
      maze('e', 158, null, 'Down the right side', '', 'H-JEPA circles near the start. CriticJEPA goes right, then straight down to the goal.'),
      maze('f', 152, null, 'Up from the corner', '', 'H-JEPA drifts off course. CriticJEPA climbs out of the corner to the goal.'),
      maze('g', 127, null, 'Over the top', '', 'H-JEPA knots up in place. CriticJEPA takes the top corridor to the goal.'),
      maze('h', 106, null, 'Up the right corridor', '', 'H-JEPA twists back and forth. CriticJEPA climbs the right corridor to the goal.'),
      maze('i', 95, null, 'Around the corner', '', 'H-JEPA barely moves. CriticJEPA turns the corner to the goal.'),
    ],
    pusht: [
      clip('pusht-024', 15, 90, 75, 'Turn and seat the T', 'Push the T into the pose shown in the goal image within 90 steps.'),
      clip('pusht-046', 15, 90, 75, 'Across the table', 'H-JEPA leaves the T far from its target. CriticJEPA brings it over and rotates it into place.'),
      clip('pusht-020', 15, 90, 77, 'A quarter turn', 'CriticJEPA swings the T around its corner into the goal pose.'),
      clip('pusht-036', 15, 90, 75, 'Fine alignment', 'A small correction is still contact-rich. CriticJEPA settles the T on its target.'),
    ],
    cube: [
      clip('cube-006', 8, 30, 15, 'Grasp and place', 'Reach, grasp and move the cube to the goal pose within 30 steps.'),
      clip('cube-028', 8, 30, 16, 'Pick up from the side', 'H-JEPA never closes on the cube. CriticJEPA grasps and lifts it into place.'),
      clip('cube-020', 8, 30, 17, 'Carry it over', 'CriticJEPA picks the cube up and carries it to the goal.'),
      clip('cube-045', 8, 30, 15, 'Short and precise', 'CriticJEPA reaches the goal pose in 15 steps.'),
    ],
    fourroom: [
      clip('fourroom-023', 20, 210, 115, 'Up and through', 'Steer the red agent into the gold ring within 210 steps. Blue is a distractor. CriticJEPA-0 uses no gradient steps.'),
      clip('fourroom-019', 20, 210, 146, 'Across two rooms', 'H-JEPA stays in its room. CriticJEPA-0 crosses a doorway into the ring.'),
      clip('fourroom-029', 20, 210, 171, 'The long way down', 'H-JEPA heads the wrong way. CriticJEPA-0 drops through two doorways into the ring.'),
    ],
  };
})();
