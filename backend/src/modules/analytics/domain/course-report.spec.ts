import { buildCourseReport, toPlainStatement } from "./course-report";
import type { RawAttempt, RawCourseReport } from "./course-report";

const attempt = (overrides: Partial<RawAttempt>): RawAttempt => ({
  quizId: "quiz-1",
  status: "FAILED",
  questionIds: ["q1", "q2"],
  answers: [],
  ...overrides,
});

function buildRaw(overrides: Partial<RawCourseReport> = {}): RawCourseReport {
  return {
    courseId: "course-1",
    courseTitle: "Excel avancé",
    enrolledCount: 20,
    startedCount: 15,
    moduleValidatedCount: 10,
    examPassedCount: 5,
    modules: [
      { moduleId: "m1", title: "Formules", order: 1, quizId: "quiz-1" },
      { moduleId: "m2", title: "Tableaux croisés", order: 2, quizId: "quiz-2" },
      { moduleId: "m3", title: "Sans quiz", order: 3, quizId: null },
    ],
    questions: [
      { id: "q1", statementHtml: "<p>RECHERCHEV&nbsp;?</p>", scope: "Formules", correctOptionIds: ["a"] },
      { id: "q2", statementHtml: "Somme.si", scope: "Formules", correctOptionIds: ["b", "c"] },
    ],
    attempts: [],
    ...overrides,
  };
}

describe("buildCourseReport — entonnoir", () => {
  it("exprime chaque étape en pourcentage des inscrits", () => {
    const { funnel } = buildCourseReport(buildRaw());
    expect(funnel.map((step) => [step.key, step.count, step.percentOfEnrolled])).toEqual([
      ["ENROLLED", 20, 100],
      ["STARTED", 15, 75],
      ["MODULE_VALIDATED", 10, 50],
      ["EXAM_PASSED", 5, 25],
    ]);
  });

  it("ne divise pas par zéro sans inscrit", () => {
    const { funnel } = buildCourseReport(
      buildRaw({ enrolledCount: 0, startedCount: 0, moduleValidatedCount: 0, examPassedCount: 0 }),
    );
    expect(funnel.every((step) => step.percentOfEnrolled === 0)).toBe(true);
  });
});

describe("buildCourseReport — modules bloquants", () => {
  it("classe par taux d'échec et ignore les modules sans tentative ou sans quiz", () => {
    const attempts = [
      attempt({ quizId: "quiz-1", status: "FAILED" }),
      attempt({ quizId: "quiz-1", status: "PASSED" }),
      attempt({ quizId: "quiz-2", status: "FAILED" }),
      attempt({ quizId: "quiz-2", status: "FAILED" }),
    ];
    const { blockingModules } = buildCourseReport(buildRaw({ attempts }));
    expect(blockingModules.map((module) => [module.title, module.failureRatePercent, module.attempts])).toEqual([
      ["Tableaux croisés", 100, 2],
      ["Formules", 50, 2],
    ]);
  });

  it("ignore les tentatives de l'examen", () => {
    const { blockingModules } = buildCourseReport(buildRaw({ attempts: [attempt({ quizId: null })] }));
    expect(blockingModules).toEqual([]);
  });
});

describe("buildCourseReport — questions les plus échouées", () => {
  const wrongQ1 = attempt({ questionIds: ["q1"], answers: [{ questionId: "q1", selectedOptionIds: ["x"] }] });
  const rightQ1 = attempt({
    questionIds: ["q1"],
    status: "PASSED",
    answers: [{ questionId: "q1", selectedOptionIds: ["a"] }],
  });

  it("n'affiche pas une question trop peu posée pour être significative", () => {
    const { failedQuestions } = buildCourseReport(buildRaw({ attempts: [wrongQ1, wrongQ1] }));
    expect(failedQuestions).toEqual([]);
  });

  it("compte une réponse fausse, partielle ou absente comme un échec", () => {
    const noAnswer = attempt({ questionIds: ["q1"], answers: [] });
    const { failedQuestions } = buildCourseReport(buildRaw({ attempts: [wrongQ1, noAnswer, rightQ1] }));
    expect(failedQuestions).toHaveLength(1);
    expect(failedQuestions[0]).toMatchObject({ questionId: "q1", asked: 3, wrong: 2, failureRatePercent: 67 });
  });

  it("exige l'ensemble exact des bonnes options (choix multiple)", () => {
    const partial = attempt({ questionIds: ["q2"], answers: [{ questionId: "q2", selectedOptionIds: ["b"] }] });
    const exact = attempt({
      questionIds: ["q2"],
      status: "PASSED",
      answers: [{ questionId: "q2", selectedOptionIds: ["c", "b"] }],
    });
    const { failedQuestions } = buildCourseReport(buildRaw({ attempts: [partial, partial, exact] }));
    expect(failedQuestions[0]).toMatchObject({ questionId: "q2", asked: 3, wrong: 2 });
  });

  it("n'affiche pas une question que tout le monde réussit, et nettoie l'énoncé HTML", () => {
    const { failedQuestions } = buildCourseReport(buildRaw({ attempts: [rightQ1, rightQ1, rightQ1, wrongQ1] }));
    expect(failedQuestions[0]?.statement).toBe("RECHERCHEV ?");
    const allRight = buildCourseReport(buildRaw({ attempts: [rightQ1, rightQ1, rightQ1] }));
    expect(allRight.failedQuestions).toEqual([]);
  });
});

describe("toPlainStatement", () => {
  it("retire les balises, normalise les espaces et tronque", () => {
    expect(toPlainStatement("<p>Un   <b>énoncé</b></p>")).toBe("Un énoncé");
    expect(toPlainStatement("x".repeat(300), 10)).toHaveLength(10);
  });
});
