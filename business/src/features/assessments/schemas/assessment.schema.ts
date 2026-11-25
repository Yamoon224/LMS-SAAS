import { z } from "zod";

/** Doit rester cohérent avec QuestionType (backend/.../assessments/domain/question-type.ts). */
export const questionTypeSchema = z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Choix unique",
  MULTIPLE_CHOICE: "Choix multiple",
  TRUE_FALSE: "Vrai / Faux",
};

/** Doit rester cohérent avec ResultsDisplay (même fichier backend). */
export const resultsDisplaySchema = z.enum(["SCORE_ONLY", "SCORE_AND_ANSWERS", "DETAILED"]);
export type ResultsDisplay = z.infer<typeof resultsDisplaySchema>;

export const RESULTS_DISPLAY_LABELS: Record<ResultsDisplay, string> = {
  SCORE_ONLY: "Score seul",
  SCORE_AND_ANSWERS: "Score + bonnes réponses",
  DETAILED: "Score + corrections détaillées",
};

/** Une évaluation s'attache soit à un module (quiz), soit à une formation (examen final). */
export type AssessmentScope = { kind: "quiz"; moduleId: string } | { kind: "exam"; courseId: string };

export const questionSchema = z.object({
  id: z.string(),
  type: questionTypeSchema,
  statementHtml: z.string(),
  explanation: z.string().nullable(),
  points: z.number(),
  order: z.number(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      isCorrect: z.boolean(),
      order: z.number(),
    }),
  ),
});
export type Question = z.infer<typeof questionSchema>;

/** GET /business/modules/:moduleId/quiz — DTO aplati (toQuizResponse). */
export const quizSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  passingScorePercent: z.number(),
  maxAttempts: z.number().nullable(),
  delayBetweenAttemptsMinutes: z.number().nullable(),
  timeLimitMinutes: z.number().nullable(),
  questionsToDraw: z.number().nullable(),
  shuffleQuestions: z.boolean(),
  shuffleAnswers: z.boolean(),
  resultsDisplay: resultsDisplaySchema,
  requireLiveAttendance: z.boolean(),
  questions: z.array(questionSchema),
});
export type Quiz = z.infer<typeof quizSchema>;

/** GET /business/courses/:courseId/exam — DTO aplati (toExamResponse). */
export const examSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  passingScorePercent: z.number(),
  maxAttempts: z.number().nullable(),
  delayBetweenAttemptsMinutes: z.number().nullable(),
  timeLimitMinutes: z.number(),
  questionsPerModule: z.number().nullable(),
  allowReentry: z.boolean(),
  weight: z.number().optional(),
  questions: z.array(questionSchema),
});
export type Exam = z.infer<typeof examSchema>;

const INT_MESSAGE = "Nombre entier attendu.";

function intField(min: number, max?: number) {
  const base = z.number({ invalid_type_error: INT_MESSAGE }).int(INT_MESSAGE).min(min, `Minimum ${min}.`);
  return max === undefined ? base : base.max(max, `Maximum ${max}.`);
}

/** Champ numérique optionnel : champ vide => undefined (puis null à l'envoi, pour pouvoir effacer une valeur). */
function optionalInt(min: number) {
  return intField(min).optional();
}

/** Doit rester cohérent avec SetQuizRulesDto (assessments/presentation/dto/set-passing-rules.dto.ts). */
export const quizRulesSchema = z.object({
  passingScorePercent: intField(0, 100),
  maxAttempts: optionalInt(1),
  delayBetweenAttemptsMinutes: optionalInt(0),
  timeLimitMinutes: optionalInt(1),
  questionsToDraw: optionalInt(1),
  shuffleQuestions: z.boolean(),
  shuffleAnswers: z.boolean(),
  resultsDisplay: resultsDisplaySchema,
  requireLiveAttendance: z.boolean(),
});
export type QuizRulesValues = z.infer<typeof quizRulesSchema>;

/** Doit rester cohérent avec SetExamRulesDto (assessments/presentation/dto/set-exam-rules.dto.ts). */
export const examRulesSchema = z.object({
  passingScorePercent: intField(0),
  maxAttempts: optionalInt(1),
  delayBetweenAttemptsMinutes: optionalInt(0),
  timeLimitMinutes: intField(1),
  questionsPerModule: optionalInt(1),
  allowReentry: z.boolean(),
  /** Poids dans la note finale de la formation (défaut 1 ; 0 = exclu du calcul). */
  weight: intField(0, 100).optional(),
});
export type ExamRulesValues = z.infer<typeof examRulesSchema>;

/**
 * Doit rester cohérent avec CreateQuestionDto (backend) + assertValidQuestionDraft :
 * >= 2 options (ArrayMinSize), libellé 1..500, points entier >= 1, au moins une bonne réponse.
 * Plus strict côté UI (non imposé par le backend) : choix unique / vrai-faux => exactement une
 * bonne réponse, sinon la question serait impossible à réussir avec des boutons radio.
 */
export const createQuestionSchema = z
  .object({
    type: questionTypeSchema,
    statementHtml: z.string().trim().min(1, "L'énoncé est requis."),
    explanation: z.string().optional(),
    points: intField(1),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Libellé requis.").max(500, "500 caractères maximum."),
          isCorrect: z.boolean(),
        }),
      )
      .min(2, "Au moins 2 réponses."),
  })
  .superRefine((value, ctx) => {
    const correctCount = value.options.filter((option) => option.isCorrect).length;
    if (correctCount === 0) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Cochez au moins une bonne réponse." });
    } else if (value.type !== "MULTIPLE_CHOICE" && correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Ce type de question n'admet qu'une seule bonne réponse.",
      });
    }
  });
export type CreateQuestionValues = z.infer<typeof createQuestionSchema>;

/** Doit rester cohérent avec GrantAttemptsDto (extraAttempts entier >= 1 ; enrollmentId fourni par le contexte). */
export const grantAttemptsSchema = z.object({
  extraAttempts: intField(1),
});
export type GrantAttemptsValues = z.infer<typeof grantAttemptsSchema>;
