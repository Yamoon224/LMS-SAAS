import { Option } from "./option.vo";
import { QuestionType } from "./question-type";
import { Question } from "./question.entity";

function buildOption(id: string, isCorrect: boolean, order = 0): Option {
  return Option.fromPersistence({ id, label: id, isCorrect, order });
}

function buildQuestion(type: QuestionType, options: Option[]): Question {
  return Question.fromPersistence({
    id: "q1",
    type,
    statementHtml: "<p>Question</p>",
    explanation: null,
    points: 1,
    order: 0,
    moduleWeight: null,
    options,
  });
}

describe("Question entity - isAnsweredCorrectly", () => {
  it("accepts the single correct option for SINGLE_CHOICE", () => {
    const question = buildQuestion(QuestionType.SINGLE_CHOICE, [
      buildOption("a", true),
      buildOption("b", false),
    ]);
    expect(question.isAnsweredCorrectly(["a"])).toBe(true);
    expect(question.isAnsweredCorrectly(["b"])).toBe(false);
  });

  it("requires exactly all correct options for MULTIPLE_CHOICE — no more, no less (RG-11)", () => {
    const question = buildQuestion(QuestionType.MULTIPLE_CHOICE, [
      buildOption("a", true),
      buildOption("b", true),
      buildOption("c", false),
    ]);

    expect(question.isAnsweredCorrectly(["a", "b"])).toBe(true);
    expect(question.isAnsweredCorrectly(["a"])).toBe(false); // partial selection
    expect(question.isAnsweredCorrectly(["a", "b", "c"])).toBe(false); // extra wrong option
    expect(question.isAnsweredCorrectly(["c"])).toBe(false);
  });

  it("treats an empty selection as incorrect", () => {
    const question = buildQuestion(QuestionType.SINGLE_CHOICE, [
      buildOption("a", true),
      buildOption("b", false),
    ]);
    expect(question.isAnsweredCorrectly([])).toBe(false);
  });

  it("handles TRUE_FALSE like a single-choice question", () => {
    const question = buildQuestion(QuestionType.TRUE_FALSE, [
      buildOption("true", true),
      buildOption("false", false),
    ]);
    expect(question.isAnsweredCorrectly(["true"])).toBe(true);
    expect(question.isAnsweredCorrectly(["false"])).toBe(false);
  });

  it("exposes the set of correct option ids", () => {
    const question = buildQuestion(QuestionType.MULTIPLE_CHOICE, [
      buildOption("a", true),
      buildOption("b", true),
      buildOption("c", false),
    ]);
    expect(question.correctOptionIds.sort()).toEqual(["a", "b"]);
  });
});
