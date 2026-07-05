import { describe, it, expect } from "vitest";
import {
  precisionAtK,
  recallAtK,
  reciprocalRank,
  mean,
} from "../evals/metrics";

describe("precisionAtK", () => {
  it("counts relevant items in the top-k window", () => {
    expect(precisionAtK([true, false, true, false], 4)).toBe(0.5);
  });
  it("only looks at the first k", () => {
    expect(precisionAtK([true, true, false, false], 2)).toBe(1);
  });
  it("is 0 for an empty ranking", () => {
    expect(precisionAtK([], 5)).toBe(0);
  });
});

describe("recallAtK", () => {
  it("is hits-in-top-k over total relevant", () => {
    expect(recallAtK([true, false, true], 4, 3)).toBe(0.5);
  });
  it("guards against divide-by-zero", () => {
    expect(recallAtK([true], 0, 1)).toBe(0);
  });
});

describe("reciprocalRank", () => {
  it("is 1 when the first item is relevant", () => {
    expect(reciprocalRank([true, false])).toBe(1);
  });
  it("is 1/rank of the first relevant item", () => {
    expect(reciprocalRank([false, false, true])).toBeCloseTo(1 / 3, 9);
  });
  it("is 0 when nothing is relevant", () => {
    expect(reciprocalRank([false, false])).toBe(0);
  });
});

describe("mean", () => {
  it("averages a list", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
  it("is 0 for an empty list", () => {
    expect(mean([])).toBe(0);
  });
});
