import { InvalidStateTransitionError } from "@shared/errors";

import { Attempt } from "./attempt.entity";
import { Option } from "./option.vo";
import { AttemptStatus, QuestionType } from "./question-type";
import { Question } from "./question.entity";

function buildQuestion(id: string, correctOptionId: string, points = 1): Question {
  return Question.fromPersistence({
    id,
    type: QuestionType.SINGLE_CHOICE,
    statementHtml: "<p>Q</p>",
    explanation: null,
    points,
    order: 0,
    moduleWeight: null,
    options: [
      Option.fromPersistence({ id: correctOptionId, label: "correct", isCorrect: true, order: 0 }),
      Option.fromPersistence({ id: `${correctOptionId}-wrong`, label: "wrong", isCorrect: false, order: 1 }),
    ],
  });
}

function buildAttempt(overrides: {
  status?: AttemptStatus;
  questionIds?: string[];
  answers?: { questionId: string; selectedOptionIds: string[] }[];
  startedAt?: Date;
}): Attempt {
  return Attempt.fromPersistence({
    id: "attempt-1",
    enrollmentId: "enrollment-1",
    quizId: "quiz-1",
    examId: null,
    questionIds: overrides.questionIds ?? ["q1", "q2"],
    status: overrides.status ?? AttemptStatus.IN_PROGRESS,
    answers: overrides.answers ?? [],
    scorePercent: null,
    startedAt: overrides.startedAt ?? new Date(),
    submittedAt: null,
  });
}

describe("Attempt entity - answer recording", () => {
  it("records a new answer", () => {
    const attempt = buildAttempt({});
    attempt.recordAnswer({ questionId: "q1", selectedOptionIds: ["q1-correct"] });
    expect(attempt.toSnapshot().answers).toHaveLength(1);
  });

  it("overwrites a previous answer to the same question", () => {
    const attempt = buildAttempt({});
    attempt.recordAnswer({ questionId: "q1", selectedOptionIds: ["a"] });
    attempt.recordAnswer({ questionId: "q1", selectedOptionIds: ["b"] });
    const answers = attempt.toSnapshot().answers;
    expect(answers).toHaveLength(1);
    expect(answers[0]?.selectedOptionIds).toEqual(["b"]);
  });

  it("rejects recording an answer on a submitted attempt", () => {
    const attempt = buildAttempt({ status: AttemptStatus.SUBMITTED });
    expect(() => attempt.recordAnswer({ questionId: "q1", selectedOptionIds: [] })).toThrow(
      InvalidStateTransitionError,
    );
  });
});

describe("Attempt entity - scoring and submission (RG-11/RG-12)", () => {
  it("passes when the score meets the threshold", () => {
    const q1 = buildQuestion("q1", "q1-correct");
    const q2 = buildQuestion("q2", "q2-correct");
    const attempt = buildAttempt({
      questionIds: ["q1", "q2"],
      answers: [
        { questionId: "q1", selectedOptionIds: ["q1-correct"] },
        { questionId: "q2", selectedOptionIds: ["q2-correct"] },
      ],
    });

    attempt.submit([q1, q2], 60);

    expect(attempt.scorePercent).toBe(100);
    expect(attempt.status).toBe(AttemptStatus.PASSED);
  });

  it("fails when the score is below the threshold", () => {
    const q1 = buildQuestion("q1", "q1-correct");
    const q2 = buildQuestion("q2", "q2-correct");
    const attempt = buildAttempt({
      questionIds: ["q1", "q2"],
      answers: [{ questionId: "q1", selectedOptionIds: ["q1-correct"] }],
    });

    attempt.submit([q1, q2], 60);

    expect(attempt.scorePercent).toBe(50);
    expect(attempt.status).toBe(AttemptStatus.FAILED);
  });

  it("only scores questions actually drawn for this attempt, ignoring other questions passed in (ENT-28)", () => {
    const q1 = buildQuestion("q1", "q1-correct");
    const q2 = buildQuestion("q2", "q2-correct");
    const q3 = buildQuestion("q3", "q3-correct"); // not drawn for this attempt
    const attempt = buildAttempt({
      questionIds: ["q1", "q2"],
      answers: [
        { questionId: "q1", selectedOptionIds: ["q1-correct"] },
        { questionId: "q2", selectedOptionIds: ["q2-correct"] },
        { questionId: "q3", selectedOptionIds: ["q3-correct"] },
      ],
    });

    attempt.submit([q1, q2, q3], 60);

    expect(attempt.scorePercent).toBe(100); // not diluted by q3
  });

  it("scores an unanswered question as incorrect", () => {
    const q1 = buildQuestion("q1", "q1-correct");
    const q2 = buildQuestion("q2", "q2-correct");
    const attempt = buildAttempt({ questionIds: ["q1", "q2"], answers: [] });

    attempt.submit([q1, q2], 60);

    expect(attempt.scorePercent).toBe(0);
  });
});

describe("Attempt entity - expiry and invalid transitions", () => {
  it("expires instead of passing even if the computed score would be sufficient (ENT-36)", () => {
    const q1 = buildQuestion("q1", "q1-correct");
    const attempt = buildAttempt({
      questionIds: ["q1"],
      answers: [{ questionId: "q1", selectedOptionIds: ["q1-correct"] }],
    });

    attempt.expire([q1]);

    expect(attempt.status).toBe(AttemptStatus.EXPIRED);
    expect(attempt.scorePercent).toBe(100); // computed for information, but status stays EXPIRED
  });

  it("rejects submitting an already submitted attempt", () => {
    const attempt = buildAttempt({ status: AttemptStatus.PASSED });
    expect(() => attempt.submit([], 60)).toThrow(InvalidStateTransitionError);
  });

  it("rejects expiring an attempt that already reached a terminal status", () => {
    const attempt = buildAttempt({ status: AttemptStatus.FAILED });
    expect(() => attempt.expire([])).toThrow(InvalidStateTransitionError);
  });
});
