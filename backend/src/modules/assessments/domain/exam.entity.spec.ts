import { Exam, type ExamProps } from "./exam.entity";
import { QuestionType } from "./question-type";
import { Question } from "./question.entity";

function build(overrides: Partial<ExamProps> = {}): Exam {
  return Exam.fromPersistence({
    id: "exam-1",
    courseId: "course-1",
    passingScorePercent: 75,
    maxAttempts: 2,
    delayBetweenAttemptsMinutes: null,
    timeLimitMinutes: 60,
    questionsPerModule: 5,
    allowReentry: true,
    questions: [
      Question.fromPersistence({
        id: "q1",
        type: QuestionType.TRUE_FALSE,
        statementHtml: "<p>Q</p>",
        explanation: null,
        points: 1,
        order: 0,
        moduleWeight: "m1",
        options: [],
      }),
    ],
    ...overrides,
  });
}

describe("Exam entity", () => {
  it("exposes its simple props", () => {
    const exam = build();

    expect(exam.id).toBe("exam-1");
    expect(exam.courseId).toBe("course-1");
    expect(exam.questions.map((q) => q.id)).toEqual(["q1"]);
    expect(exam.allowReentry).toBe(true);
    expect(exam.questionsPerModule).toBe(5);
  });

  it("defaults the weight to 1 and honours an explicit weight (ENT-34)", () => {
    expect(build().weight).toBe(1);
    expect(build({ weight: 2 }).weight).toBe(2);
  });

  it("builds passing rules from its configuration", () => {
    const rules = build().passingRules;

    expect(rules.passingScorePercent).toBe(75);
    expect(rules.maxAttempts).toBe(2);
    expect(rules.delayBetweenAttemptsMinutes).toBeNull();
    expect(rules.timeLimitMinutes).toBe(60);
  });
});
