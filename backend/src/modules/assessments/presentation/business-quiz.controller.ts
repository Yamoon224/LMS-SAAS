import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { NotFoundDomainError } from "@shared/errors";

import { ConfigureQuizUseCase } from "../application/configure-quiz.use-case";
import { GrantExtraAttemptsUseCase } from "../application/grant-extra-attempts.use-case";
import { ManageQuizQuestionsUseCase } from "../application/manage-quiz-questions.use-case";
import type { Quiz } from "../domain/quiz.entity";
import { QUIZ_REPOSITORY } from "../domain/quiz.repository.port";
import type { QuizRepositoryPort } from "../domain/quiz.repository.port";

import { toQuestionResponse } from "./assessment-response";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { GrantAttemptsDto } from "./dto/grant-attempts.dto";
import { SetQuizRulesDto } from "./dto/set-passing-rules.dto";

/** Quiz aplati: règles de passage + questions (avec bonnes réponses, vue gestionnaire). */
function toQuizResponse(quiz: Quiz) {
  const rules = quiz.passingRules;
  return {
    id: quiz.id,
    moduleId: quiz.moduleId,
    passingScorePercent: rules.passingScorePercent,
    maxAttempts: rules.maxAttempts,
    delayBetweenAttemptsMinutes: rules.delayBetweenAttemptsMinutes,
    timeLimitMinutes: rules.timeLimitMinutes,
    questionsToDraw: quiz.questionsToDraw,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleAnswers: quiz.shuffleAnswers,
    resultsDisplay: quiz.resultsDisplay,
    requireLiveAttendance: quiz.requireLiveAttendance,
    weight: quiz.weight,
    questions: quiz.questions.map(toQuestionResponse),
  };
}

/** ENT-27 à ENT-31: quiz de fin de module. */
@ApiTags("Entreprise / Quiz")
@Controller("business/modules/:moduleId/quiz")
export class BusinessQuizController {
  constructor(
    private readonly configureQuizUseCase: ConfigureQuizUseCase,
    private readonly manageQuizQuestionsUseCase: ManageQuizQuestionsUseCase,
    private readonly grantExtraAttemptsUseCase: GrantExtraAttemptsUseCase,
    private readonly courseContentFacade: CourseContentFacade,
    @Inject(QUIZ_REPOSITORY) private readonly quizRepository: QuizRepositoryPort,
  ) {}

  @Get()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Quiz du module: règles et questions (vue gestionnaire)" })
  async findOne(@CurrentTenant() tenantId: string, @Param("moduleId") moduleId: string) {
    await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
    const quiz = await this.quizRepository.findByModuleId(moduleId);
    if (!quiz) {
      throw new NotFoundDomainError(`Aucun quiz configuré pour ce module: ${moduleId}.`);
    }
    return toQuizResponse(quiz);
  }

  @Put()
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Configurer les règles de passage du quiz (ENT-28)" })
  async configure(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: SetQuizRulesDto,
  ) {
    await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
    const quiz = await this.configureQuizUseCase.execute(moduleId, dto);
    return { id: quiz.id };
  }

  @Post("questions")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Ajouter une question (ENT-27)" })
  async addQuestion(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
    const quizId = await this.resolveQuizId(moduleId);
    await this.manageQuizQuestionsUseCase.addQuestion(quizId, dto);
    return { moduleId };
  }

  @Delete("questions/:questionId")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Supprimer une question" })
  async removeQuestion(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Param("questionId") questionId: string,
  ) {
    await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
    const quizId = await this.resolveQuizId(moduleId);
    await this.manageQuizQuestionsUseCase.removeQuestion(quizId, questionId);
    return { questionId, deleted: true };
  }

  @Post("grant-attempts")
  @RequirePermissions("courses.manage")
  @ApiOperation({ summary: "Accorder des tentatives supplémentaires (ENT-31/RG-10)" })
  async grantAttempts(
    @CurrentTenant() tenantId: string,
    @Param("moduleId") moduleId: string,
    @Body() dto: GrantAttemptsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const courseId = await this.courseContentFacade.assertModuleInTenant(moduleId, tenantId);
    const quizId = await this.resolveQuizId(moduleId);
    await this.grantExtraAttemptsUseCase.forQuiz(dto.enrollmentId, quizId, dto.extraAttempts, user.userId, courseId);
    return { enrollmentId: dto.enrollmentId, extraAttempts: dto.extraAttempts };
  }

  private async resolveQuizId(moduleId: string): Promise<string> {
    const quiz = await this.quizRepository.findByModuleId(moduleId);
    if (!quiz) {
      throw new NotFoundDomainError(
        `Aucun quiz configuré pour ce module: ${moduleId}. Configurez les règles de passage d'abord.`,
      );
    }
    return quiz.id;
  }
}
