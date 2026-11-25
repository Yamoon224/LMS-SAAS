/**
 * ENT-67 : rapport par formation — entonnoir, modules bloquants, questions les plus échouées.
 * Fonctions pures (section 13.1) : l'infrastructure fournit les données brutes, le domaine calcule.
 */

export interface RawQuestion {
  id: string;
  statementHtml: string;
  /** « Examen » ou titre du module portant le quiz. */
  scope: string;
  correctOptionIds: readonly string[];
}

/** Tentative terminée (réussie ou échouée) d'un quiz ou de l'examen. */
export interface RawAttempt {
  /** Renseigné pour un quiz, null pour l'examen. */
  quizId: string | null;
  status: "PASSED" | "FAILED";
  questionIds: readonly string[];
  answers: readonly { questionId: string; selectedOptionIds: readonly string[] }[];
}

export interface RawModule {
  moduleId: string;
  title: string;
  order: number;
  quizId: string | null;
}

export interface RawCourseReport {
  courseId: string;
  courseTitle: string;
  enrolledCount: number;
  startedCount: number;
  moduleValidatedCount: number;
  examPassedCount: number;
  modules: readonly RawModule[];
  questions: readonly RawQuestion[];
  attempts: readonly RawAttempt[];
}

export interface FunnelStep {
  key: "ENROLLED" | "STARTED" | "MODULE_VALIDATED" | "EXAM_PASSED";
  count: number;
  /** Part des inscrits ; 0 si personne n'est inscrit. */
  percentOfEnrolled: number;
}

export interface ModuleDifficulty {
  moduleId: string;
  title: string;
  order: number;
  attempts: number;
  failedAttempts: number;
  failureRatePercent: number;
}

export interface QuestionDifficulty {
  questionId: string;
  statement: string;
  scope: string;
  asked: number;
  wrong: number;
  failureRatePercent: number;
}

export interface CourseReport {
  courseId: string;
  courseTitle: string;
  funnel: FunnelStep[];
  /** Modules ayant au moins une tentative, du plus bloquant au moins bloquant. */
  blockingModules: ModuleDifficulty[];
  /** Questions posées au moins `MIN_QUESTION_SAMPLE` fois, de la plus échouée à la moins échouée. */
  failedQuestions: QuestionDifficulty[];
}

/** Sous ce nombre de tentatives, un taux d'échec de question n'est pas significatif. */
export const MIN_QUESTION_SAMPLE = 3;
export const MAX_FAILED_QUESTIONS = 10;
export const MAX_BLOCKING_MODULES = 5;

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Texte brut d'un énoncé HTML, tronqué pour l'affichage en liste. */
export function toPlainStatement(html: string, maxLength = 160): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function buildFunnel(raw: RawCourseReport): FunnelStep[] {
  const steps: [FunnelStep["key"], number][] = [
    ["ENROLLED", raw.enrolledCount],
    ["STARTED", raw.startedCount],
    ["MODULE_VALIDATED", raw.moduleValidatedCount],
    ["EXAM_PASSED", raw.examPassedCount],
  ];
  return steps.map(([key, count]) => ({ key, count, percentOfEnrolled: percent(count, raw.enrolledCount) }));
}

export function rankBlockingModules(raw: RawCourseReport): ModuleDifficulty[] {
  return raw.modules
    .flatMap((module) => {
      if (!module.quizId) return [];
      const attempts = raw.attempts.filter((attempt) => attempt.quizId === module.quizId);
      if (attempts.length === 0) return [];
      const failedAttempts = attempts.filter((attempt) => attempt.status === "FAILED").length;
      return [
        {
          moduleId: module.moduleId,
          title: module.title,
          order: module.order,
          attempts: attempts.length,
          failedAttempts,
          failureRatePercent: percent(failedAttempts, attempts.length),
        },
      ];
    })
    .sort((a, b) => b.failureRatePercent - a.failureRatePercent || b.failedAttempts - a.failedAttempts)
    .slice(0, MAX_BLOCKING_MODULES);
}

/**
 * Une question est « posée » quand elle figure dans les questions tirées d'une tentative ; elle est « échouée »
 * si la réponse donnée n'est pas exactement l'ensemble des bonnes options (même règle que la correction).
 * Une question sans réponse compte comme échouée.
 */
export function rankFailedQuestions(raw: RawCourseReport): QuestionDifficulty[] {
  const tally = new Map<string, { asked: number; wrong: number }>();

  for (const attempt of raw.attempts) {
    for (const questionId of attempt.questionIds) {
      const question = raw.questions.find((candidate) => candidate.id === questionId);
      if (!question) continue;
      const selected = new Set(attempt.answers.find((answer) => answer.questionId === questionId)?.selectedOptionIds);
      const correct = new Set(question.correctOptionIds);
      const isCorrect = correct.size === selected.size && [...correct].every((id) => selected.has(id));
      const entry = tally.get(questionId) ?? { asked: 0, wrong: 0 };
      entry.asked += 1;
      if (!isCorrect) entry.wrong += 1;
      tally.set(questionId, entry);
    }
  }

  return [...tally.entries()]
    .filter(([, { asked, wrong }]) => asked >= MIN_QUESTION_SAMPLE && wrong > 0)
    .flatMap(([questionId, { asked, wrong }]) => {
      const question = raw.questions.find((candidate) => candidate.id === questionId);
      if (!question) return [];
      return [
        {
          questionId,
          statement: toPlainStatement(question.statementHtml),
          scope: question.scope,
          asked,
          wrong,
          failureRatePercent: percent(wrong, asked),
        },
      ];
    })
    .sort((a, b) => b.failureRatePercent - a.failureRatePercent || b.wrong - a.wrong)
    .slice(0, MAX_FAILED_QUESTIONS);
}

export function buildCourseReport(raw: RawCourseReport): CourseReport {
  return {
    courseId: raw.courseId,
    courseTitle: raw.courseTitle,
    funnel: buildFunnel(raw),
    blockingModules: rankBlockingModules(raw),
    failedQuestions: rankFailedQuestions(raw),
  };
}
