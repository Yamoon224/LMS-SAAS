import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";
import { sanitizeHtml } from "@shared/security/html-sanitizer";

import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";
import { assertValidQuestionDraft } from "../domain/question-draft";
import type { CreateQuestionData } from "../domain/quiz.repository.port";

/** ENT-34: création des questions de l'examen final. */
@Injectable()
export class ManageExamQuestionsUseCase {
  constructor(@Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort) {}

  async addQuestion(examId: string, data: CreateQuestionData): Promise<void> {
    assertValidQuestionDraft(data.options);

    await this.examRepository.addQuestion(examId, {
      ...data,
      statementHtml: sanitizeHtml(data.statementHtml),
    });
  }

  /** La question doit appartenir à l'examen déjà vérifié dans le tenant: sinon 404. */
  async removeQuestion(examId: string, questionId: string): Promise<void> {
    const exam = await this.examRepository.findById(examId);
    if (!exam?.questions.some((question) => question.id === questionId)) {
      throw new NotFoundDomainError(`Question introuvable: ${questionId}`);
    }
    await this.examRepository.removeQuestion(questionId);
  }
}
