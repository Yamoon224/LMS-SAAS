import { drawQuestionsByModule } from "./exam-question-drawer";
import { QuestionType } from "./question-type";
import { Question } from "./question.entity";

function question(id: string, moduleWeight: string | null): Question {
  return Question.fromPersistence({
    id,
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q</p>",
    explanation: null,
    points: 1,
    order: 0,
    moduleWeight,
    options: [],
  });
}

describe("drawQuestionsByModule (ENT-34)", () => {
  const pool = [
    question("a1", "A"),
    question("a2", "A"),
    question("a3", "A"),
    question("b1", "B"),
    question("n1", null),
    question("n2", null),
  ];

  it("returns a copy of all questions when no per-module count is configured", () => {
    const result = drawQuestionsByModule(pool, null);

    expect(result.map((q) => q.id)).toEqual(["a1", "a2", "a3", "b1", "n1", "n2"]);
    expect(result).not.toBe(pool);
  });

  it("draws at most N questions in each module bucket", () => {
    const result = drawQuestionsByModule(pool, 2, () => 0.5);
    const ids = result.map((q) => q.id);

    expect(result.filter((q) => q.moduleWeight === "A")).toHaveLength(2);
    expect(result.filter((q) => q.moduleWeight === "B")).toHaveLength(1);
    expect(ids).toEqual(expect.arrayContaining(["b1"]));
    expect(result.filter((q) => q.moduleWeight === null)).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("groups questions without module together in a single bucket", () => {
    const result = drawQuestionsByModule([question("n1", null), question("n2", null), question("n3", null)], 1);

    expect(result).toHaveLength(1);
  });

  it("returns an empty list for an empty pool", () => {
    expect(drawQuestionsByModule([], 3)).toEqual([]);
  });
});
