import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";
import { sanitizeHtml } from "@shared/security/html-sanitizer";

import { assertValidQuestionDraft } from "../domain/question-draft";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { CreateQuestionData } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

/** ENT-27: création des questions — au moins une bonne réponse, énoncé nettoyé (BE-09). */
@Injectable()
export class ManageQuizQuestionsUseCase {
  constructor(@Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort) {}

  async addQuestion(quizId: string, data: CreateQuestionData): Promise<void> {
    assertValidQuestionDraft(data.options);

    await this.quizRepository.addQuestion(quizId, {
      ...data,
      statementHtml: sanitizeHtml(data.statementHtml),
    });
  }

  /** La question doit appartenir au quiz déjà vérifié dans le tenant: sinon 404 (jamais de suppression croisée). */
  async removeQuestion(quizId: string, questionId: string): Promise<void> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz?.questions.some((question) => question.id === questionId)) {
      throw new NotFoundDomainError(`Question introuvable: ${questionId}`);
    }
    await this.quizRepository.removeQuestion(questionId);
  }
}
