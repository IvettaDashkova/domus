import { describe, it, expect } from "vitest";
import { haversineMeters, haversineKm } from "../src/lib/geo";

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters(51.1093, 17.0333, 51.1093, 17.0333)).toBe(0);
  });

  it("matches ~111.19 km for one degree of latitude", () => {
    // 1° latitude on a sphere of R=6_371_000 m ≈ 111_195 m.
    expect(haversineMeters(0, 0, 1, 0)).toBeCloseTo(111_194.9, 0);
  });

  it("is symmetric", () => {
    const ab = haversineMeters(52.2297, 21.0122, 51.1093, 17.0333);
    const ba = haversineMeters(51.1093, 17.0333, 52.2297, 21.0122);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it("gives a realistic Warsaw→Wrocław distance (~300 km ± 15%)", () => {
    const m = haversineMeters(52.2297, 21.0122, 51.1093, 17.0333);
    expect(m).toBeGreaterThan(255_000);
    expect(m).toBeLessThan(345_000);
  });

  it("haversineKm is metres / 1000", () => {
    const m = haversineMeters(52.2, 21.0, 51.1, 17.0);
    expect(haversineKm(52.2, 21.0, 51.1, 17.0)).toBeCloseTo(m / 1000, 6);
  });
});
