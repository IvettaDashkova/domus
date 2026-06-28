/**
 * Retrieval metric stubs. `flags[i] === true` means the item at rank i (0-based)
 * is relevant. Real, simple implementations — the harness reports them now;
 * the matcher gets tuned against them later.
 */

export function precisionAtK(flags: boolean[], k: number): number {
  const top = flags.slice(0, k);
  if (top.length === 0) return 0;
  return top.filter(Boolean).length / top.length;
}

export function recallAtK(flags: boolean[], totalRelevant: number, k: number): number {
  if (totalRelevant === 0) return 0;
  return flags.slice(0, k).filter(Boolean).length / totalRelevant;
}

/** Mean reciprocal rank for a single query: 1 / (rank of first relevant). */
export function reciprocalRank(flags: boolean[]): number {
  const idx = flags.findIndex(Boolean);
  return idx === -1 ? 0 : 1 / (idx + 1);
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}
