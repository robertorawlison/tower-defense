import { CFG } from './config.js';
import { randomPathBFS } from './pathfinding.js';

export const CELL_TYPES = {
  GRASS: 'grass',
  PATH: 'path',
  BUILD_SLOT: 'slot',
  CASTLE: 'castle',
  DECORATION: 'decor',
};

const DECOR_KEYS = ['tree_pine', 'tree_oak', 'rock', 'bush', 'stump', 'barrel', 'crate', 'logs', 'fence', 'fire', 'sign', 'banner'];

export function generateMap() {
  const cols = CFG.GRID_COLS;
  const rows = CFG.GRID_ROWS;

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: CELL_TYPES.GRASS, decor: null, pathTile: null }))
  );

  const castleStartCol = cols - CFG.CASTLE_COLS - 1;
  const castleStartRow = Math.floor((rows - CFG.CASTLE_ROWS) / 2);
  const castleArea = { col: castleStartCol, row: castleStartRow, cols: CFG.CASTLE_COLS, rows: CFG.CASTLE_ROWS };

  for (let r = castleStartRow; r < castleStartRow + CFG.CASTLE_ROWS; r++) {
    for (let c = castleStartCol; c < castleStartCol + CFG.CASTLE_COLS; c++) {
      grid[r][c].type = CELL_TYPES.CASTLE;
    }
  }

  const goal = { c: castleStartCol - 1, r: castleStartRow + Math.floor(CFG.CASTLE_ROWS / 2) };

  const spawnRowA = Math.max(1, Math.floor(rows * 0.25));
  const spawnRowB = Math.min(rows - 2, Math.floor(rows * 0.75));
  const spawns = [
    { c: 0, r: spawnRowA },
    { c: 0, r: spawnRowB },
  ];

  const blocked = new Set();
  for (let r = castleStartRow; r < castleStartRow + CFG.CASTLE_ROWS; r++) {
    for (let c = castleStartCol; c < castleStartCol + CFG.CASTLE_COLS; c++) {
      blocked.add(`${c},${r}`);
    }
  }

  const paths = [];
  for (let i = 0; i < spawns.length; i++) {
    const path = randomPathBFS(cols, rows, spawns[i], goal, blocked, 0.7);
    if (!path) {
      return generateMap();
    }
    paths.push(path);
    for (const cell of path) {
      if (cell.c !== goal.c || cell.r !== goal.r) {
        if (i > 0 && Math.random() < 0.3) continue;
      }
    }
  }

  for (const path of paths) {
    for (const cell of path) {
      if (grid[cell.r][cell.c].type !== CELL_TYPES.CASTLE) {
        grid[cell.r][cell.c].type = CELL_TYPES.PATH;
      }
    }
  }

  computePathTiles(grid, cols, rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type !== CELL_TYPES.GRASS) continue;
      if (isAdjacentToPath(grid, c, r, cols, rows)) {
        if (Math.random() < CFG.SLOT_DENSITY) {
          grid[r][c].type = CELL_TYPES.BUILD_SLOT;
        }
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === CELL_TYPES.GRASS && Math.random() < CFG.DECOR_DENSITY) {
        grid[r][c].decor = DECOR_KEYS[Math.floor(Math.random() * DECOR_KEYS.length)];
      }
    }
  }

  const waypoints = paths.map((path) => path.map((cell) => cellCenter(cell.c, cell.r)));

  return { grid, cols, rows, paths, waypoints, spawns, goal, castleArea };
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

function computePathTiles(grid, cols, rows) {
  const isPath = (c, r) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    return grid[r][c].type === CELL_TYPES.PATH;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type !== CELL_TYPES.PATH) continue;
      const n = isPath(c, r - 1);
      const s = isPath(c, r + 1);
      const e = isPath(c + 1, r);
      const w = isPath(c - 1, r);
      grid[r][c].pathTile = pickPathTile(n, s, e, w);
    }
  }
}

function pickPathTile(n, s, e, w) {
  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);
  if (count === 4) return 'cross';
  if (count === 3) {
    if (!n) return 't_down';
    if (!s) return 't_up';
    if (!e) return 't_left';
    if (!w) return 't_right';
  }
  if (count === 2) {
    if (n && s) return 'straight_v';
    if (e && w) return 'straight_h';
    if (n && e) return 'corner_bl';
    if (n && w) return 'corner_br';
    if (s && e) return 'corner_tl';
    if (s && w) return 'corner_tr';
  }
  if (e || w) return 'straight_h';
  return 'straight_v';
}
