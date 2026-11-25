import { Question } from "./question.entity";
import { QuestionType, ResultsDisplay } from "./question-type";
import { Quiz, type QuizProps } from "./quiz.entity";

function question(id: string): Question {
  return Question.fromPersistence({
    id,
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q</p>",
    explanation: null,
    points: 1,
    order: 0,
    moduleWeight: null,
    options: [],
  });
}

function build(overrides: Partial<QuizProps> = {}): Quiz {
  return Quiz.fromPersistence({
    id: "quiz-1",
    moduleId: "mod-1",
    passingScorePercent: 70,
    maxAttempts: 3,
    delayBetweenAttemptsMinutes: 15,
    timeLimitMinutes: 30,
    questionsToDraw: null,
    shuffleQuestions: true,
    shuffleAnswers: false,
    resultsDisplay: ResultsDisplay.DETAILED,
    requireLiveAttendance: true,
    questions: [question("q1"), question("q2")],
    ...overrides,
  });
}

describe("Quiz entity", () => {
  it("exposes its simple props", () => {
    const quiz = build();

    expect(quiz.id).toBe("quiz-1");
    expect(quiz.moduleId).toBe("mod-1");
    expect(quiz.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(quiz.questionsToDraw).toBeNull();
    expect(quiz.requireLiveAttendance).toBe(true);
    expect(quiz.resultsDisplay).toBe(ResultsDisplay.DETAILED);
    expect(quiz.shuffleQuestions).toBe(true);
    expect(quiz.shuffleAnswers).toBe(false);
  });

  it("defaults the weight to 1 and honours an explicit weight (ENT-34)", () => {
    expect(build().weight).toBe(1);
    expect(build({ weight: 3 }).weight).toBe(3);
  });

  it("builds passing rules from its configuration", () => {
    const rules = build().passingRules;

    expect(rules.passingScorePercent).toBe(70);
    expect(rules.maxAttempts).toBe(3);
    expect(rules.delayBetweenAttemptsMinutes).toBe(15);
    expect(rules.timeLimitMinutes).toBe(30);
  });

  it("draws all questions when questionsToDraw is not configured (ENT-28)", () => {
    expect(build().questionCountForAttempt).toBe(2);
  });

  it("uses questionsToDraw when configured (ENT-28)", () => {
    expect(build({ questionsToDraw: 1 }).questionCountForAttempt).toBe(1);
  });
});
