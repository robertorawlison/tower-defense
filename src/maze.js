const NEIGH = [
  { dc: 0, dr: -1 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
];

const TURN_BIAS = 0.85;

const key = (c, r) => `${c},${r}`;

function inBounds(c, r, b) {
  return c >= b.colMin && c <= b.colMax && r >= b.rowMin && r <= b.rowMax;
}

function isCellAllowed(c, r, bounds, blocked) {
  return inBounds(c, r, bounds) && !blocked.has(key(c, r));
}

function pickStartCell(bounds, blocked) {
  const corners = [
    { c: bounds.colMin, r: bounds.rowMin },
    { c: bounds.colMax, r: bounds.rowMin },
    { c: bounds.colMin, r: bounds.rowMax },
    { c: bounds.colMax, r: bounds.rowMax },
  ];
  for (const cand of corners) {
    if (!blocked.has(key(cand.c, cand.r))) return cand;
  }
  for (let r = bounds.rowMin; r <= bounds.rowMax; r++) {
    for (let c = bounds.colMin; c <= bounds.colMax; c++) {
      if (!blocked.has(key(c, r))) return { c, r };
    }
  }
  return null;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateMaze(bounds, blocked, rng) {
  const connections = new Map();
  const visited = new Set();
  const start = pickStartCell(bounds, blocked);
  if (!start) return { connections };

  const stack = [{ c: start.c, r: start.r, lastDir: null }];
  visited.add(key(start.c, start.r));
  connections.set(key(start.c, start.r), new Set());

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const dirs = shuffle([...NEIGH], rng);
    if (cur.lastDir && rng() < TURN_BIAS) {
      const straightIdx = dirs.findIndex((d) => d.dc === cur.lastDir.dc && d.dr === cur.lastDir.dr);
      if (straightIdx >= 0) dirs.push(dirs.splice(straightIdx, 1)[0]);
    }
    let advancedDir = null;
    for (const d of dirs) {
      const nc = cur.c + d.dc;
      const nr = cur.r + d.dr;
      if (!isCellAllowed(nc, nr, bounds, blocked)) continue;
      const nk = key(nc, nr);
      if (visited.has(nk)) continue;
      const ck = key(cur.c, cur.r);
      if (!connections.has(ck)) connections.set(ck, new Set());
      if (!connections.has(nk)) connections.set(nk, new Set());
      connections.get(ck).add(nk);
      connections.get(nk).add(ck);
      visited.add(nk);
      stack.push({ c: nc, r: nr, lastDir: d });
      advancedDir = d;
      break;
    }
    if (!advancedDir) stack.pop();
  }
  return { connections };
}

export function solveMazeBFS(connections, start, end) {
  const startKey = key(start.c, start.r);
  const endKey = key(end.c, end.r);
  if (!connections.has(startKey) || !connections.has(endKey)) return null;

  const parents = new Map();
  parents.set(startKey, null);
  const queue = [startKey];
  let head = 0;

  while (head < queue.length) {
    const curKey = queue[head++];
    if (curKey === endKey) {
      const path = [];
      let k = endKey;
      while (k !== null) {
        const [c, r] = k.split(',').map(Number);
        path.unshift({ c, r });
        k = parents.get(k);
      }
      return path;
    }
    const neighbors = connections.get(curKey);
    if (!neighbors) continue;
    for (const nk of neighbors) {
      if (parents.has(nk)) continue;
      parents.set(nk, curKey);
      queue.push(nk);
    }
  }
  return null;
}

export function concatPathsAtSeam(pathA, pathB) {
  if (!pathA || !pathB) return null;
  const last = pathA[pathA.length - 1];
  const first = pathB[0];
  if (last.c === first.c && last.r === first.r) {
    return [...pathA, ...pathB.slice(1)];
  }
  return [...pathA, ...pathB];
}
