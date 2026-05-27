import { CFG } from './config.js';

export const Q1 = 'Q1';
export const Q2 = 'Q2';
export const Q3 = 'Q3';
export const Q4 = 'Q4';

export const ALL_QUADRANTS = [Q1, Q2, Q3, Q4];

export function quadrantBounds(q) {
  const cols = CFG.GRID_COLS;
  const rows = CFG.GRID_ROWS;
  const midC = Math.floor(cols / 2);
  const midR = Math.floor(rows / 2);
  switch (q) {
    case Q1: return { colMin: midC,   colMax: cols - 1, rowMin: 0,    rowMax: midR - 1 };
    case Q2: return { colMin: 0,      colMax: midC - 1, rowMin: 0,    rowMax: midR - 1 };
    case Q3: return { colMin: 0,      colMax: midC - 1, rowMin: midR, rowMax: rows - 1 };
    case Q4: return { colMin: midC,   colMax: cols - 1, rowMin: midR, rowMax: rows - 1 };
  }
  throw new Error(`Quadrante inválido: ${q}`);
}

function externalEdgeTiles(q) {
  const b = quadrantBounds(q);
  const tiles = [];
  switch (q) {
    case Q1:
      for (let c = b.colMin; c <= b.colMax; c++) tiles.push({ c, r: b.rowMin });
      for (let r = b.rowMin; r <= b.rowMax; r++) tiles.push({ c: b.colMax, r });
      break;
    case Q2:
      for (let c = b.colMin; c <= b.colMax; c++) tiles.push({ c, r: b.rowMin });
      for (let r = b.rowMin; r <= b.rowMax; r++) tiles.push({ c: b.colMin, r });
      break;
    case Q3:
      for (let c = b.colMin; c <= b.colMax; c++) tiles.push({ c, r: b.rowMax });
      for (let r = b.rowMin; r <= b.rowMax; r++) tiles.push({ c: b.colMin, r });
      break;
    case Q4:
      for (let c = b.colMin; c <= b.colMax; c++) tiles.push({ c, r: b.rowMax });
      for (let r = b.rowMin; r <= b.rowMax; r++) tiles.push({ c: b.colMax, r });
      break;
  }
  return tiles;
}

export function randomExternalEdgeCell(q, rng) {
  const tiles = externalEdgeTiles(q);
  return tiles[Math.floor(rng() * tiles.length)];
}

export function castleEdgeCellsHardQuadrant(q, castleArea) {
  const cMin = castleArea.col;
  const cMax = castleArea.col + castleArea.cols - 1;
  const rMin = castleArea.row;
  const rMax = castleArea.row + castleArea.rows - 1;
  switch (q) {
    case Q1: return [{ c: cMax, r: rMin - 1 }, { c: cMax + 1, r: rMin }];
    case Q2: return [{ c: cMin, r: rMin - 1 }, { c: cMin - 1, r: rMin }];
    case Q3: return [{ c: cMin, r: rMax + 1 }, { c: cMin - 1, r: rMax }];
    case Q4: return [{ c: cMax, r: rMax + 1 }, { c: cMax + 1, r: rMax }];
  }
  throw new Error(`Quadrante inválido: ${q}`);
}

export function stitchedSideForPair(qA, qB) {
  const set = new Set([qA, qB]);
  if (set.has(Q2) && set.has(Q3)) return 'left';
  if (set.has(Q4) && set.has(Q1)) return 'right';
  if (set.has(Q1) && set.has(Q2)) return 'top';
  if (set.has(Q3) && set.has(Q4)) return 'bottom';
  return null;
}

export function castleEdgeCellsForSide(side, castleArea) {
  const cMin = castleArea.col;
  const cMax = castleArea.col + castleArea.cols - 1;
  const rMin = castleArea.row;
  const rMax = castleArea.row + castleArea.rows - 1;
  const out = [];
  switch (side) {
    case 'left':   for (let r = rMin; r <= rMax; r++) out.push({ c: cMin - 1, r }); break;
    case 'right':  for (let r = rMin; r <= rMax; r++) out.push({ c: cMax + 1, r }); break;
    case 'top':    for (let c = cMin; c <= cMax; c++) out.push({ c, r: rMin - 1 }); break;
    case 'bottom': for (let c = cMin; c <= cMax; c++) out.push({ c, r: rMax + 1 }); break;
  }
  return out;
}

export function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}
