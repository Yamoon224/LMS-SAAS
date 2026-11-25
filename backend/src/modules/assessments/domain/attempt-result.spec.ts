import { buildAttemptResult } from "./attempt-result";
import { Option } from "./option.vo";
import { AttemptStatus, QuestionType, ResultsDisplay } from "./question-type";
import { Question } from "./question.entity";

const questions = [
  Question.fromPersistence({
    id: "q1",
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q1</p>",
    explanation: "Parce que A.",
    points: 1,
    order: 0,
    moduleWeight: null,
    options: [
      Option.fromPersistence({ id: "a", label: "A", isCorrect: true, order: 0 }),
      Option.fromPersistence({ id: "b", label: "B", isCorrect: false, order: 1 }),
    ],
  }),
  Question.fromPersistence({
    id: "q2",
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q2</p>",
    explanation: "Parce que D.",
    points: 1,
    order: 1,
    moduleWeight: null,
    options: [
      Option.fromPersistence({ id: "c", label: "C", isCorrect: false, order: 0 }),
      Option.fromPersistence({ id: "d", label: "D", isCorrect: true, order: 1 }),
    ],
  }),
];

const base = {
  attemptId: "att-1",
  status: AttemptStatus.FAILED,
  scorePercent: 50,
  passingScorePercent: 70,
  submittedAt: new Date("2026-01-01T10:00:00Z"),
  drawnQuestions: questions,
  answers: [
    { questionId: "q1", selectedOptionIds: ["a"] },
    { questionId: "q2", selectedOptionIds: ["c"] },
  ],
};

describe("buildAttemptResult", () => {
  it("SCORE_ONLY: score et réussite, aucune correction", () => {
    const result = buildAttemptResult({ ...base, kind: "QUIZ", resultsDisplay: ResultsDisplay.SCORE_ONLY });
    expect(result.review).toBeUndefined();
    expect(result.scorePercent).toBe(50);
    expect(result.passed).toBe(false);
    expect(JSON.stringify(result)).not.toContain("correctOptionIds");
  });

  it("SCORE_AND_ANSWERS: correction par question avec bonnes réponses, sans explication", () => {
    const result = buildAttemptResult({ ...base, kind: "QUIZ", resultsDisplay: ResultsDisplay.SCORE_AND_ANSWERS });
    expect(result.review).toEqual([
      { questionId: "q1", selectedOptionIds: ["a"], isCorrect: true, correctOptionIds: ["a"] },
      { questionId: "q2", selectedOptionIds: ["c"], isCorrect: false, correctOptionIds: ["d"] },
    ]);
    expect(JSON.stringify(result)).not.toContain("explanation");
  });

  it("DETAILED: ajoute les explications", () => {
    const result = buildAttemptResult({ ...base, kind: "QUIZ", resultsDisplay: ResultsDisplay.DETAILED });
    expect(result.review?.map((r) => r.explanation)).toEqual(["Parce que A.", "Parce que D."]);
  });

  it("une question sans réponse est incorrecte", () => {
    const result = buildAttemptResult({
      ...base,
      answers: [],
      kind: "QUIZ",
      resultsDisplay: ResultsDisplay.SCORE_AND_ANSWERS,
    });
    expect(result.review?.every((r) => !r.isCorrect && r.selectedOptionIds.length === 0)).toBe(true);
  });

  it("un examen ne révèle jamais de correction, quelle que soit la configuration", () => {
    const result = buildAttemptResult({
      ...base,
      status: AttemptStatus.PASSED,
      kind: "EXAM",
      resultsDisplay: ResultsDisplay.DETAILED,
    });
    expect(result.review).toBeUndefined();
    expect(result.resultsDisplay).toBe(ResultsDisplay.SCORE_ONLY);
    expect(result.passed).toBe(true);
  });
});
