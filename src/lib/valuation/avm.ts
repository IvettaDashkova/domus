import type { Comp } from "@/lib/valuation/comps";

export interface CompWeighted extends Comp {
  weight: number; // normalized contribution share (0..1)
}

export interface Valuation {
  estimate: number;
  low: number;
  high: number;
  confidence: number; // 0..1
  dispersion: number; // coefficient of variation of comp prices
  compCount: number;
  radiusKm: number;
  method: string;
  comps: CompWeighted[];
  actual: number | null;
  errorPct: number | null;
}

/**
 * Inverse-distance-weighted AVM. Each comp is weighted by spatial proximity and
 * bedroom similarity; the estimate is the weighted mean of comp prices. Range =
 * ±1 weighted std; confidence rises with comp count and falls with dispersion.
 */
export function valuate(
  comps: Comp[],
  subject: { bedrooms: number | null },
  radiusM: number,
  actual: number | null = null,
): Valuation {
  if (comps.length === 0) throw new Error("no comparable sales found");

  const weighted = comps.map((c) => {
    const wDist = 1 / (c.distanceM + 50); // +50m epsilon
    const wBeds =
      subject.bedrooms != null && c.bedrooms != null
        ? 1 / (1 + Math.abs(c.bedrooms - subject.bedrooms))
        : 1;
    return { comp: c, w: wDist * wBeds };
  });

  const wsum = weighted.reduce((s, x) => s + x.w, 0);
  const estimate = weighted.reduce((s, x) => s + x.w * x.comp.price, 0) / wsum;
  const variance =
    weighted.reduce((s, x) => s + x.w * (x.comp.price - estimate) ** 2, 0) / wsum;
  const std = Math.sqrt(variance);
  const dispersion = estimate > 0 ? std / estimate : 0;

  const countFactor = Math.min(comps.length, 10) / 10;
  const dispFactor = 1 - Math.min(dispersion, 0.6) / 0.6;
  const confidence = Math.max(0, Math.min(1, countFactor * dispFactor));

  const compsWeighted: CompWeighted[] = weighted
    .map((x) => ({ ...x.comp, weight: x.w / wsum }))
    .sort((a, b) => b.weight - a.weight);

  return {
    estimate: Math.round(estimate),
    low: Math.max(0, Math.round(estimate - std)),
    high: Math.round(estimate + std),
    confidence: Math.round(confidence * 100) / 100,
    dispersion: Math.round(dispersion * 1000) / 1000,
    compCount: comps.length,
    radiusKm: Math.round(radiusM / 100) / 10,
    method: "inverse-distance-weighted mean (bedroom-adjusted)",
    comps: compsWeighted,
    actual,
    errorPct:
      actual != null && actual > 0
        ? Math.round((Math.abs(estimate - actual) / actual) * 1000) / 10
        : null,
  };
}
