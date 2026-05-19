export function randomPathBFS(cols, rows, start, end, blocked, randomness = 0.5) {
  const isBlocked = (c, r) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
    return blocked.has(`${c},${r}`);
  };

  const visited = new Map();
  const queue = [{ c: start.c, r: start.r, parent: null, cost: 0 }];
  visited.set(`${start.c},${start.r}`, queue[0]);

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const node = queue.shift();
    if (node.c === end.c && node.r === end.r) {
      const path = [];
      let cur = node;
      while (cur) {
        path.unshift({ c: cur.c, r: cur.r });
        cur = cur.parent;
      }
      return path;
    }
    const neighbors = [
      { c: node.c + 1, r: node.r },
      { c: node.c - 1, r: node.r },
      { c: node.c, r: node.r + 1 },
      { c: node.c, r: node.r - 1 },
    ];
    for (const n of neighbors) {
      const key = `${n.c},${n.r}`;
      if (visited.has(key)) continue;
      if (isBlocked(n.c, n.r)) continue;
      const heuristic = Math.abs(end.c - n.c) + Math.abs(end.r - n.r);
      const extra = Math.random() * randomness * 20;
      const cost = node.cost + 1 + extra + heuristic * 0.5;
      const next = { c: n.c, r: n.r, parent: node, cost };
      visited.set(key, next);
      queue.push(next);
    }
  }
  return null;
}
