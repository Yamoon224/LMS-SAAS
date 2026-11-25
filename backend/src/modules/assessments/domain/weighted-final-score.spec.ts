import { computeWeightedFinalScore } from "./weighted-final-score";

describe("computeWeightedFinalScore (ENT-34)", () => {
  it("returns the plain mean when all weights are equal", () => {
    expect(
      computeWeightedFinalScore([
        { scorePercent: 80, weight: 1 },
        { scorePercent: 60, weight: 1 },
      ]),
    ).toBe(70);
  });

  it("weights the exam more than the quizzes", () => {
    // (90*1 + 70*1 + 50*3) / 5 = 62
    expect(
      computeWeightedFinalScore([
        { scorePercent: 90, weight: 1 },
        { scorePercent: 70, weight: 1 },
        { scorePercent: 50, weight: 3 },
      ]),
    ).toBe(62);
  });

  it("ignores evaluations without a score and weight-0 evaluations", () => {
    expect(
      computeWeightedFinalScore([
        { scorePercent: 80, weight: 2 },
        { scorePercent: null, weight: 5 },
        { scorePercent: 0, weight: 0 },
      ]),
    ).toBe(80);
  });

  it("returns null when nothing counts", () => {
    expect(computeWeightedFinalScore([])).toBeNull();
    expect(computeWeightedFinalScore([{ scorePercent: null, weight: 1 }])).toBeNull();
  });

  it("rounds to the nearest integer", () => {
    expect(
      computeWeightedFinalScore([
        { scorePercent: 100, weight: 1 },
        { scorePercent: 0, weight: 2 },
      ]),
    ).toBe(33);
  });

  it("rejects negative or non-finite weights", () => {
    expect(() => computeWeightedFinalScore([{ scorePercent: 50, weight: -1 }])).toThrow(RangeError);
    expect(() => computeWeightedFinalScore([{ scorePercent: 50, weight: Number.NaN }])).toThrow(RangeError);
  });
});
