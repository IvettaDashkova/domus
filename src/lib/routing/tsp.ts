/**
 * TSP over a travel-time matrix. Exact (Held-Karp) for small N, heuristic
 * (nearest-neighbour + 2-opt) for larger. Node 0 (or opts.start) is the fixed
 * starting point (the agent's origin); returnToStart closes the loop.
 */

export interface TspResult {
  order: number[]; // visiting order, begins with `start`
  totalSeconds: number; // sum of leg durations (+ return leg if returnToStart)
}

export function tourCost(d: number[][], order: number[], returnToStart: boolean): number {
  let s = 0;
  for (let k = 0; k < order.length - 1; k++) s += d[order[k]][order[k + 1]];
  if (returnToStart && order.length > 1) s += d[order[order.length - 1]][order[0]];
  return s;
}

export function solveTsp(
  d: number[][],
  opts: { start?: number; returnToStart?: boolean } = {},
): TspResult {
  const n = d.length;
  const start = opts.start ?? 0;
  const ret = opts.returnToStart ?? false;
  if (n <= 1) return { order: [start], totalSeconds: 0 };
  if (n <= 12) return heldKarp(d, start, ret);
  return nn2opt(d, start, ret);
}

function heldKarp(d: number[][], start: number, ret: boolean): TspResult {
  const n = d.length;
  const FULL = 1 << n;
  const INF = Infinity;
  const dp = Array.from({ length: FULL }, () => new Float64Array(n).fill(INF));
  const par = Array.from({ length: FULL }, () => new Int16Array(n).fill(-1));
  dp[1 << start][start] = 0;

  for (let mask = 0; mask < FULL; mask++) {
    if (!(mask & (1 << start))) continue;
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i)) || dp[mask][i] === INF) continue;
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const nm = mask | (1 << j);
        const c = dp[mask][i] + d[i][j];
        if (c < dp[nm][j]) {
          dp[nm][j] = c;
          par[nm][j] = i;
        }
      }
    }
  }

  const full = FULL - 1;
  let best = INF;
  let last = start;
  for (let i = 0; i < n; i++) {
    if (dp[full][i] === INF) continue;
    const c = dp[full][i] + (ret ? d[i][start] : 0);
    if (c < best) {
      best = c;
      last = i;
    }
  }

  const order: number[] = [];
  let mask = full;
  let i = last;
  while (i !== -1) {
    order.push(i);
    const p = par[mask][i];
    mask ^= 1 << i;
    i = p;
  }
  order.reverse();
  return { order, totalSeconds: best };
}

function nn2opt(d: number[][], start: number, ret: boolean): TspResult {
  const n = d.length;
  const unvisited = new Set<number>();
  for (let i = 0; i < n; i++) if (i !== start) unvisited.add(i);

  const order = [start];
  let cur = start;
  while (unvisited.size) {
    let best = Infinity;
    let nx = -1;
    for (const j of unvisited) {
      if (d[cur][j] < best) {
        best = d[cur][j];
        nx = j;
      }
    }
    order.push(nx);
    unvisited.delete(nx);
    cur = nx;
  }

  // 2-opt — keep the start node fixed at position 0.
  let improved = true;
  while (improved) {
    improved = false;
    for (let a = 1; a < order.length - 1; a++) {
      for (let b = a + 1; b < order.length; b++) {
        const cand = order
          .slice(0, a)
          .concat(order.slice(a, b + 1).reverse(), order.slice(b + 1));
        if (tourCost(d, cand, ret) < tourCost(d, order, ret) - 1e-9) {
          order.splice(0, order.length, ...cand);
          improved = true;
        }
      }
    }
  }
  return { order, totalSeconds: tourCost(d, order, ret) };
}
