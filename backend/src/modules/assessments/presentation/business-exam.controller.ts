import { CoursesFacade } from "@modules/courses/courses.facade";
import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { NotFoundDomainError } from "@shared/errors";

import { ConfigureExamUseCase } from "../application/configure-exam.use-case";
import { GrantExtraAttemptsUseCase } from "../application/grant-extra-attempts.use-case";
import { ListExamAttemptsUseCase } from "../application/list-exam-attempts.use-case";
import { ManageExamQuestionsUseCase } from "../application/manage-exam-questions.use-case";
import type { Exam } from "../domain/exam.entity";
import { EXAM_REPOSITORY } from "../domain/exam.repository.port";
import type { ExamRepositoryPort } from "../domain/exam.repository.port";

import { toQuestionResponse } from "./assessment-response";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { GrantAttemptsDto } from "./dto/grant-attempts.dto";
import { SetExamRulesDto } from "./dto/set-exam-rules.dto";

/** Examen aplati: règles de passage + questions (avec bonnes réponses, vue gestionnaire). */
function toExamResponse(exam: Exam) {
  const rules = exam.passingRules;
  return {
    id: exam.id,
    courseId: exam.courseId,
    passingScorePercent: rules.passingScorePercent,
    maxAttempts: rules.maxAttempts,
    delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
    timeLimitMinutes: rules.timeLimitMinutes,
    questionsPerModule: exam.questionsPerModule,
    allowReentry: exam.allowReentry,
    weight: exam.weight,
    questions: exam.questions.map(toQuestionResponse),
  };
}

/** ENT-34 à ENT-37: examen final des formations certifiantes. */
@ApiTags("Entreprise / Examen final")
@Controller("business/courses/:courseId/exam")
export class BusinessExamController {
  constructor(
    private readonly configureExamUseCase: ConfigureExamUseCase,
    private readonly manageExamQuestionsUseCase: ManageExamQuestionsUseCase,
    private readonly grantExtraAttemptsUseCase: GrantExtraAttemptsUseCase,
    private readonly listExamAttemptsUseCase: ListExamAttemptsUseCase,
    private readonly coursesFacade: CoursesFacade,
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepositoryPort,
  ) {}

  @Get()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Examen final de la formation: règles et questions (vue gestionnaire)" })
  async findOne(@CurrentTenant() tenantId: string, @Param("courseId") courseId: string) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const exam = await this.examRepository.findByCourseId(courseId);
    if (!exam) {
      throw new NotFoundDomainError(`Aucun examen configuré pour cette formation: ${courseId}.`);
    }
    return toExamResponse(exam);
  }

  @Get("attempts")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Tentatives d'examen par apprenant : note, statut, date (ENT-37)" })
  async listAttempts(@CurrentTenant() tenantId: string, @Param("courseId") courseId: string) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    return this.listExamAttemptsUseCase.execute(courseId);
  }

  @Put()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Configurer l'examen final (ENT-34)" })
  async configure(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: SetExamRulesDto,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const exam = await this.configureExamUseCase.execute(courseId, dto);
    return { id: exam.id };
  }

  @Post("questions")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Ajouter une question d'examen (ENT-34)" })
  async addQuestion(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const examId = await this.resolveExamId(courseId);
    await this.manageExamQuestionsUseCase.addQuestion(examId, dto);
    return { courseId };
  }

  @Delete("questions/:questionId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Supprimer une question d'examen" })
  async removeQuestion(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Param("questionId") questionId: string,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const examId = await this.resolveExamId(courseId);
    await this.manageExamQuestionsUseCase.removeQuestion(examId, questionId);
    return { questionId, deleted: true };
  }

  @Post("grant-attempts")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Accorder des tentatives supplémentaires (ENT-31/RG-10)" })
  async grantAttempts(
    @CurrentTenant() tenantId: string,
    @Param("courseId") courseId: string,
    @Body() dto: GrantAttemptsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const examId = await this.resolveExamId(courseId);
    await this.grantExtraAttemptsUseCase.forExam(dto.enrollmentId, examId, dto.extraAttempts, user.userId, courseId);
    return { enrollmentId: dto.enrollmentId, extraAttempts: dto.extraAttempts };
  }

  private async resolveExamId(courseId: string): Promise<string> {
    const exam = await this.examRepository.findByCourseId(courseId);
    if (!exam) {
      throw new NotFoundDomainError(
        `Aucun examen configuré pour cette formation: ${courseId}. Configurez les règles de passage d'abord.`,
      );
    }
    return exam.id;
  }
}
