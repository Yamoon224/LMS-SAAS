import { Option } from "./option.vo";
import { drawQuestions } from "./question-drawer";
import { QuestionType } from "./question-type";
import { Question } from "./question.entity";

function buildQuestion(id: string): Question {
  return Question.fromPersistence({
    id,
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q</p>",
    explanation: null,
    points: 1,
    order: 0,
    moduleWeight: null,
    options: [Option.fromPersistence({ id: "a", label: "a", isCorrect: true, order: 0 })],
  });
}

describe("drawQuestions (ENT-28)", () => {
  const questions = [buildQuestion("q1"), buildQuestion("q2"), buildQuestion("q3"), buildQuestion("q4")];

  it("returns all questions when count exceeds the pool size, without shuffling", () => {
    const result = drawQuestions(questions, 10, false);
    expect(result.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4"]);
  });

  it("draws exactly the requested count", () => {
    const result = drawQuestions(questions, 2, false);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.id)).toEqual(["q1", "q2"]);
  });

  it("shuffles deterministically with an injected random function", () => {
    // A constant "random" of 0 always picks index 0 in Fisher-Yates, i.e. no actual swap effect
    // beyond what the sequence dictates — deterministic and reproducible either way.
    const fixedRandom = () => 0;
    const result = drawQuestions(questions, 4, true, fixedRandom);
    expect(result).toHaveLength(4);
    expect(new Set(result.map((q) => q.id))).toEqual(new Set(["q1", "q2", "q3", "q4"]));
  });

  it("never loses or duplicates questions when shuffling", () => {
    const result = drawQuestions(questions, 4, true, Math.random);
    const ids = result.map((q) => q.id).sort();
    expect(ids).toEqual(["q1", "q2", "q3", "q4"]);
  });
});
