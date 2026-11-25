import type { Question } from "../domain/question.entity";

/**
 * Vue gestionnaire d'une question (ENT-27): contrairement à la vue apprenant,
 * `isCorrect` est exposé. Aplati — jamais l'entité brute (`{props:{...}}`).
 */
export function toQuestionResponse(question: Question) {
  return {
    id: question.id,
    type: question.type,
    statementHtml: question.statementHtml,
    explanation: question.explanation,
    points: question.points,
    order: question.order,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      isCorrect: option.isCorrect,
      order: option.order,
    })),
  };
}
