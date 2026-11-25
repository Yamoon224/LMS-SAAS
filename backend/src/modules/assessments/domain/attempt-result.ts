import type { SubmittedAnswer } from "./attempt.entity";
import { AttemptStatus, ResultsDisplay } from "./question-type";
import type { Question } from "./question.entity";

export interface QuestionReview {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  /** SCORE_AND_ANSWERS et DETAILED: bonnes réponses. */
  correctOptionIds?: string[];
  /** DETAILED uniquement: explication rédigée par l'entreprise. */
  explanation?: string | null;
}

export interface AttemptResultView {
  attemptId: string;
  kind: "QUIZ" | "EXAM";
  status: AttemptStatus;
  passed: boolean;
  scorePercent: number | null;
  passingScorePercent: number;
  submittedAt: Date | null;
  /** Règle d'affichage appliquée (toujours SCORE_ONLY pour un examen). */
  resultsDisplay: ResultsDisplay;
  /** Absent en SCORE_ONLY et pour les examens. */
  review?: QuestionReview[];
}

export interface BuildAttemptResultInput {
  attemptId: string;
  kind: "QUIZ" | "EXAM";
  status: AttemptStatus;
  scorePercent: number | null;
  passingScorePercent: number;
  submittedAt: Date | null;
  /** Défini pour un quiz (ENT-30); ignoré pour un examen. */
  resultsDisplay: ResultsDisplay | null;
  /** Questions effectivement tirées, dans l'ordre présenté. */
  drawnQuestions: readonly Question[];
  answers: readonly SubmittedAnswer[];
}

/**
 * ENT-30: visibilité du résultat côté apprenant, appliquée fidèlement :
 *  - SCORE_ONLY        -> score et réussite uniquement ;
 *  - SCORE_AND_ANSWERS -> + par question: réponse donnée, correcte ou non, bonnes réponses ;
 *  - DETAILED          -> + explication de chaque question.
 * Un examen ne révèle que score et réussite (aucune correction, pour protéger la banque de questions).
 * `isCorrect` n'est jamais exposé hors de cette fonction pour une tentative non terminée.
 */
export function buildAttemptResult(input: BuildAttemptResultInput): AttemptResultView {
  const display = input.kind === "EXAM" ? ResultsDisplay.SCORE_ONLY : (input.resultsDisplay ?? ResultsDisplay.SCORE_ONLY);

  const base: AttemptResultView = {
    attemptId: input.attemptId,
    kind: input.kind,
    status: input.status,
    passed: input.status === AttemptStatus.PASSED,
    scorePercent: input.scorePercent,
    passingScorePercent: input.passingScorePercent,
    submittedAt: input.submittedAt,
    resultsDisplay: display,
  };

  if (display === ResultsDisplay.SCORE_ONLY) return base;

  base.review = input.drawnQuestions.map((question) => {
    const selected = input.answers.find((answer) => answer.questionId === question.id)?.selectedOptionIds ?? [];
    const review: QuestionReview = {
      questionId: question.id,
      selectedOptionIds: selected,
      isCorrect: question.isAnsweredCorrectly(selected),
      correctOptionIds: question.correctOptionIds,
    };
    if (display === ResultsDisplay.DETAILED) review.explanation = question.explanation;
    return review;
  });
  return base;
}
