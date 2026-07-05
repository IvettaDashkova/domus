import { describe, it, expect } from "vitest";
import {
  haversineMatrix,
  straightLineGeometry,
  type Coord,
} from "../src/lib/routing/matrix";

const coords: Coord[] = [
  { lng: 21.0122, lat: 52.2297 }, // Warsaw
  { lng: 17.0333, lat: 51.1093 }, // Wrocław
  { lng: 19.945, lat: 50.0647 }, // Kraków
];

describe("haversineMatrix", () => {
  const m = haversineMatrix(coords);

  it("has a zero diagonal (no self-travel)", () => {
    for (let i = 0; i < coords.length; i++) expect(m[i][i]).toBe(0);
  });

  it("is symmetric", () => {
    expect(m[0][1]).toBeCloseTo(m[1][0], 9);
    expect(m[1][2]).toBeCloseTo(m[2][1], 9);
  });

  it("returns positive travel times between distinct points", () => {
    expect(m[0][1]).toBeGreaterThan(0);
  });

  it("estimates a longer time for a farther pair", () => {
    // Warsaw→Wrocław (~300 km) should take longer than Wrocław→Kraków (~230 km).
    expect(m[0][1]).toBeGreaterThan(m[1][2]);
  });
});

describe("straightLineGeometry", () => {
  it("builds a LineString of [lng, lat] pairs in order", () => {
    const geo = straightLineGeometry(coords);
    expect(geo.type).toBe("LineString");
    expect(geo.coordinates).toEqual([
      [21.0122, 52.2297],
      [17.0333, 51.1093],
      [19.945, 50.0647],
    ]);
  });
});
