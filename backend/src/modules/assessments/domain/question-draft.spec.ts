import { assertValidQuestionDraft, InvalidQuestionError } from "./question-draft";

describe("assertValidQuestionDraft (ENT-27)", () => {
  it("accepts a draft with at least one correct option", () => {
    expect(() =>
      assertValidQuestionDraft([
        { label: "a", isCorrect: false },
        { label: "b", isCorrect: true },
      ]),
    ).not.toThrow();
  });

  it("rejects a draft without any correct option", () => {
    expect(() => assertValidQuestionDraft([{ label: "a", isCorrect: false }])).toThrow(InvalidQuestionError);
  });

  it("rejects an empty draft with the QUESTION_INVALIDE code", () => {
    try {
      assertValidQuestionDraft([]);
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as InvalidQuestionError).code).toBe("QUESTION_INVALIDE");
    }
  });
});
