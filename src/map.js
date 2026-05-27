import { CFG } from './config.js';
import { generateMaze, solveMazeBFS } from './maze.js';
import {
  Q1, Q2, Q3, Q4,
  quadrantBounds,
  randomExternalEdgeCell,
  castleEdgeCellsHardQuadrant,
  castleEdgeCellsForSide,
  stitchedSideForPair,
  pickRandom,
} from './quadrants.js';
import { buildSpawnPlan, DIFFICULTY } from './difficulty.js';

export const CELL_TYPES = {
  GRASS: 'grass',
  PATH: 'path',
  BUILD_SLOT: 'slot',
  CASTLE: 'castle',
  DECORATION: 'decor',
};

const DECOR_KEYS = ['tree_pine', 'tree_oak', 'rock', 'bush', 'stump', 'barrel', 'crate', 'logs', 'fence', 'fire', 'sign', 'banner'];

const key = (c, r) => `${c},${r}`;

export function generateMap(difficulty = CFG.DIFFICULTY_DEFAULT, rng = Math.random) {
  const cols = CFG.GRID_COLS;
  const rows = CFG.GRID_ROWS;

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: CELL_TYPES.GRASS, decor: null, pathTile: null, pathConn: null }))
  );

  const castleStartCol = Math.floor((cols - CFG.CASTLE_COLS) / 2);
  const castleStartRow = Math.floor((rows - CFG.CASTLE_ROWS) / 2);
  const castleArea = { col: castleStartCol, row: castleStartRow, cols: CFG.CASTLE_COLS, rows: CFG.CASTLE_ROWS };

  for (let r = castleStartRow; r < castleStartRow + CFG.CASTLE_ROWS; r++) {
    for (let c = castleStartCol; c < castleStartCol + CFG.CASTLE_COLS; c++) {
      grid[r][c].type = CELL_TYPES.CASTLE;
    }
  }

  const blocked = new Set();
  for (let r = castleStartRow; r < castleStartRow + CFG.CASTLE_ROWS; r++) {
    for (let c = castleStartCol; c < castleStartCol + CFG.CASTLE_COLS; c++) {
      blocked.add(key(c, r));
    }
  }

  const plan = buildSpawnPlan(difficulty);
  const paths = [];
  const spawns = [];
  const ends = [];

  for (const item of plan) {
    const result = buildPathForPlanItem(item, difficulty, castleArea, blocked, rng);
    if (!result) {
      return generateMap(difficulty, rng);
    }
    paths.push(result.path);
    spawns.push(result.spawn);
    ends.push(result.end);
  }

  for (const path of paths) {
    for (const cell of path) {
      if (grid[cell.r][cell.c].type !== CELL_TYPES.CASTLE) {
        grid[cell.r][cell.c].type = CELL_TYPES.PATH;
      }
    }
  }

  computePathTiles(grid, paths);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type !== CELL_TYPES.GRASS) continue;
      if (isAdjacentToPath(grid, c, r, cols, rows)) {
        if (rng() < CFG.SLOT_DENSITY) {
          grid[r][c].type = CELL_TYPES.BUILD_SLOT;
        }
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === CELL_TYPES.GRASS && rng() < CFG.DECOR_DENSITY) {
        grid[r][c].decor = DECOR_KEYS[Math.floor(rng() * DECOR_KEYS.length)];
      }
    }
  }

  const waypoints = paths.map((path) => path.map((cell) => cellCenter(cell.c, cell.r)));

  return {
    grid, cols, rows,
    paths, waypoints,
    spawns, ends,
    castleArea,
    difficulty,
  };
}

function buildPathForPlanItem(item, difficulty, castleArea, blocked, rng) {
  if (item.kind === 'single') {
    const q = item.quadrant;
    const bounds = quadrantBounds(q);
    const start = randomExternalEdgeCell(q, rng);
    const endCandidates = castleEdgeCellsHardQuadrant(q, castleArea)
      .filter((t) => inBounds(t, bounds) && !blocked.has(key(t.c, t.r)));
    if (!endCandidates.length) return null;
    const end = pickRandom(endCandidates, rng);
    const { connections } = generateMaze(bounds, blocked, rng);
    const path = solveMazeBFS(connections, start, end);
    if (!path) return null;
    return { path, spawn: start, end };
  }

  const qA = item.quadrantA;
  const qB = item.quadrantB;
  const boundsA = quadrantBounds(qA);
  const boundsB = quadrantBounds(qB);
  const side = stitchedSideForPair(qA, qB);
  const endCandidates = castleEdgeCellsForSide(side, castleArea)
    .filter((t) => (inBounds(t, boundsA) || inBounds(t, boundsB)) && !blocked.has(key(t.c, t.r)));
  if (!endCandidates.length) return null;
  const end = pickRandom(endCandidates, rng);
  const start = randomExternalEdgeCell(qA, rng);

  const seam = pickStitchedSeam(qA, qB, blocked, rng);
  if (!seam) return null;

  const { connections: connA } = generateMaze(boundsA, blocked, rng);
  const { connections: connB } = generateMaze(boundsB, blocked, rng);
  const merged = mergeConnections(connA, connB);

  const aKey = key(seam.tileA.c, seam.tileA.r);
  const bKey = key(seam.tileB.c, seam.tileB.r);
  if (!merged.has(aKey)) merged.set(aKey, new Set());
  if (!merged.has(bKey)) merged.set(bKey, new Set());
  merged.get(aKey).add(bKey);
  merged.get(bKey).add(aKey);

  const path = solveMazeBFS(merged, start, end);
  if (!path) return null;
  return { path, spawn: start, end, seam };
}

function pickStitchedSeam(qA, qB, blocked, rng) {
  const bA = quadrantBounds(qA);
  const bB = quadrantBounds(qB);
  const candidates = [];

  if (bA.colMin === bB.colMin && bA.colMax === bB.colMax) {
    let upperBounds, lowerBounds, upperIsA;
    if (bA.rowMax + 1 === bB.rowMin) { upperBounds = bA; lowerBounds = bB; upperIsA = true; }
    else if (bB.rowMax + 1 === bA.rowMin) { upperBounds = bB; lowerBounds = bA; upperIsA = false; }
    else return null;

    for (let c = upperBounds.colMin; c <= upperBounds.colMax; c++) {
      const upper = { c, r: upperBounds.rowMax };
      const lower = { c, r: lowerBounds.rowMin };
      if (!blocked.has(key(upper.c, upper.r)) && !blocked.has(key(lower.c, lower.r))) {
        candidates.push({
          tileA: upperIsA ? upper : lower,
          tileB: upperIsA ? lower : upper,
        });
      }
    }
  } else if (bA.rowMin === bB.rowMin && bA.rowMax === bB.rowMax) {
    let leftBounds, rightBounds, leftIsA;
    if (bA.colMax + 1 === bB.colMin) { leftBounds = bA; rightBounds = bB; leftIsA = true; }
    else if (bB.colMax + 1 === bA.colMin) { leftBounds = bB; rightBounds = bA; leftIsA = false; }
    else return null;

    for (let r = leftBounds.rowMin; r <= leftBounds.rowMax; r++) {
      const left = { c: leftBounds.colMax, r };
      const right = { c: rightBounds.colMin, r };
      if (!blocked.has(key(left.c, left.r)) && !blocked.has(key(right.c, right.r))) {
        candidates.push({
          tileA: leftIsA ? left : right,
          tileB: leftIsA ? right : left,
        });
      }
    }
  }

  if (!candidates.length) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

function mergeConnections(a, b) {
  const out = new Map();
  for (const [k, set] of a) out.set(k, new Set(set));
  for (const [k, set] of b) {
    if (!out.has(k)) out.set(k, new Set());
    for (const n of set) out.get(k).add(n);
  }
  return out;
}

function inBounds(t, b) {
  return t.c >= b.colMin && t.c <= b.colMax && t.r >= b.rowMin && t.r <= b.rowMax;
}

function cellCenter(c, r) {
  return { x: c * CFG.CELL + CFG.CELL / 2, y: r * CFG.CELL + CFG.CELL / 2 };
}

function isAdjacentToPath(grid, c, r, cols, rows) {
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dc, dr] of offsets) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
    if (grid[nr][nc].type === CELL_TYPES.PATH) return true;
  }
  return false;
}

function computePathTiles(grid, paths) {
  const connections = new Map();
  const ensure = (k) => {
    if (!connections.has(k)) connections.set(k, { n: false, s: false, e: false, w: false });
    return connections.get(k);
  };

  for (const path of paths) {
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      const conn = ensure(key(cell.c, cell.r));
      const neighbors = [];
      if (i > 0) neighbors.push(path[i - 1]);
      if (i < path.length - 1) neighbors.push(path[i + 1]);
      for (const nb of neighbors) {
        const dc = nb.c - cell.c;
        const dr = nb.r - cell.r;
        if (dc === 0 && dr === -1) conn.n = true;
        else if (dc === 0 && dr === 1) conn.s = true;
        else if (dc === 1 && dr === 0) conn.e = true;
        else if (dc === -1 && dr === 0) conn.w = true;
      }
    }
  }

  for (const [k, conn] of connections) {
    const [c, r] = k.split(',').map(Number);
    if (grid[r][c].type !== CELL_TYPES.PATH) continue;
    grid[r][c].pathTile = pickPathTile(conn.n, conn.s, conn.e, conn.w);
    grid[r][c].pathConn = { n: conn.n, s: conn.s, e: conn.e, w: conn.w };
  }
}

function pickPathTile(n, s, e, w) {
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);
  if (count === 4) return 'cross';
  if (count === 3) {
    if (!n) return 't_up';
    if (!s) return 't_down';
    if (!e) return 't_left';
    if (!w) return 't_right';
  }
  if (count === 2) {
    if (n && s) return 'straight_v';
    if (e && w) return 'straight_h';
    if (n && e) return 'corner_tl';
    if (n && w) return 'corner_br';
    if (s && e) return 'corner_tr';
    if (s && w) return 'corner_bl';
  }
  if (e || w) return 'straight_h';
  return 'straight_v';
}
