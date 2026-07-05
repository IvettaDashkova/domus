import { describe, it, expect } from "vitest";
import { solveTsp, tourCost } from "../src/lib/routing/tsp";

const R2 = Math.SQRT2;
// Unit square: A(0,0) B(0,1) C(1,1) D(1,0). Adjacent edge = 1, diagonal = √2.
const square = [
  [0, 1, R2, 1],
  [1, 0, 1, R2],
  [R2, 1, 0, 1],
  [1, R2, 1, 0],
];

describe("tourCost", () => {
  it("sums consecutive legs of an open path", () => {
    expect(tourCost(square, [0, 1, 2, 3], false)).toBeCloseTo(3, 9);
  });

  it("adds the return leg when returnToStart is set", () => {
    expect(tourCost(square, [0, 1, 2, 3], true)).toBeCloseTo(4, 9);
  });
});

describe("solveTsp", () => {
  it("handles the trivial single-node case", () => {
    expect(solveTsp([[0]])).toEqual({ order: [0], totalSeconds: 0 });
  });

  it("finds the optimal open path (perimeter minus one edge)", () => {
    const { order, totalSeconds } = solveTsp(square, { start: 0 });
    expect(order[0]).toBe(0);
    expect(new Set(order)).toEqual(new Set([0, 1, 2, 3]));
    expect(totalSeconds).toBeCloseTo(3, 9); // must avoid any √2 diagonal
  });

  it("finds the optimal closed loop (full perimeter = 4)", () => {
    const { order, totalSeconds } = solveTsp(square, {
      start: 0,
      returnToStart: true,
    });
    expect(order[0]).toBe(0);
    expect(totalSeconds).toBeCloseTo(4, 9);
  });

  it("keeps the requested start node fixed at position 0", () => {
    const { order } = solveTsp(square, { start: 2, returnToStart: true });
    expect(order[0]).toBe(2);
  });

  it("never beats the exact optimum on the heuristic path (N>12)", () => {
    // 14 collinear points at x=0..13; optimal open tour from 0 is a straight
    // sweep to the far end (cost 13). The heuristic must not report less.
    const n = 14;
    const d = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => Math.abs(i - j)),
    );
    const { order, totalSeconds } = solveTsp(d, { start: 0 });
    expect(order[0]).toBe(0);
    expect(totalSeconds).toBeGreaterThanOrEqual(13);
    expect(totalSeconds).toBeCloseTo(tourCost(d, order, false), 9);
  });
});
