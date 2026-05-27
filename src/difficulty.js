import { Q1, Q2, Q3, Q4 } from './quadrants.js';

export const DIFFICULTY = { EASY: 'easy', HARD: 'hard' };

export function buildSpawnPlan(difficulty) {
  if (difficulty === DIFFICULTY.EASY) {
    return [
      { kind: 'stitched', quadrantA: Q2, quadrantB: Q3 },
      { kind: 'stitched', quadrantA: Q4, quadrantB: Q1 },
    ];
  }
  return [
    { kind: 'single', quadrant: Q1 },
    { kind: 'single', quadrant: Q2 },
    { kind: 'single', quadrant: Q3 },
    { kind: 'single', quadrant: Q4 },
  ];
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createSpawnSelector(difficulty, totalSpawns, rng) {
  if (difficulty === DIFFICULTY.EASY) {
    const earlySpawn = Math.floor(rng() * totalSpawns);
    return { difficulty, totalSpawns, earlySpawn };
  }
  const order = Array.from({ length: totalSpawns }, (_, i) => i);
  shuffle(order, rng);
  return { difficulty, totalSpawns, order };
}

export function activeSpawnIndices(selector, waveIndex) {
  if (selector.difficulty === DIFFICULTY.EASY) {
    if (waveIndex <= 3) return [selector.earlySpawn];
    return Array.from({ length: selector.totalSpawns }, (_, i) => i);
  }
  if (waveIndex <= 3) return selector.order.slice(0, Math.min(2, selector.totalSpawns));
  if (waveIndex <= 7) return selector.order.slice(0, Math.min(3, selector.totalSpawns));
  return selector.order.slice(0, selector.totalSpawns);
}
