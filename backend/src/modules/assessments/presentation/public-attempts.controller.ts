import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { AuthorizeLearnerAttemptUseCase } from "../application/authorize-learner-attempt.use-case";
import { GetLearnerAttemptUseCase } from "../application/get-learner-attempt.use-case";
import { StartExamAttemptUseCase } from "../application/start-exam-attempt.use-case";
import { StartQuizAttemptUseCase } from "../application/start-quiz-attempt.use-case";
import { SubmitAnswerUseCase } from "../application/submit-answer.use-case";
import { SubmitAttemptUseCase } from "../application/submit-attempt.use-case";

import { SubmitAnswerDto } from "./dto/submit-answer.dto";

/**
 * PUB-10/PUB-11: passage du quiz de module / de l'examen final par
 * l'apprenant. Chaque route vérifie d'abord, via AuthorizeLearnerAttemptUseCase,
 * que l'inscription / la tentative appartient à l'utilisateur authentifié et à
 * son tenant (anti-IDOR; 404 uniforme sinon).
 */
@ApiTags("Plateforme publique / Évaluations")
@Controller("public/attempts")
export class PublicAttemptsController {
  constructor(
    private readonly authorizeLearnerAttemptUseCase: AuthorizeLearnerAttemptUseCase,
    private readonly startQuizAttemptUseCase: StartQuizAttemptUseCase,
    private readonly startExamAttemptUseCase: StartExamAttemptUseCase,
    private readonly submitAnswerUseCase: SubmitAnswerUseCase,
    private readonly submitAttemptUseCase: SubmitAttemptUseCase,
    private readonly getLearnerAttemptUseCase: GetLearnerAttemptUseCase,
  ) {}

  @Post("quiz/:quizId/start")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Démarrer une tentative de quiz (PUB-10)" })
  async startQuiz(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("quizId") quizId: string,
    @Body("enrollmentId") enrollmentId: string,
  ) {
    await this.authorizeLearnerAttemptUseCase.assertCanStartQuiz(enrollmentId, quizId, user.userId, tenantId);
    const attempt = await this.startQuizAttemptUseCase.execute(enrollmentId, quizId);
    return { attemptId: attempt.id, startedAt: attempt.startedAt };
  }

  @Post("exam/:examId/start")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Démarrer une tentative d'examen (PUB-11)" })
  async startExam(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("examId") examId: string,
    @Body("enrollmentId") enrollmentId: string,
  ) {
    await this.authorizeLearnerAttemptUseCase.assertCanStartExam(enrollmentId, examId, user.userId, tenantId);
    const attempt = await this.startExamAttemptUseCase.execute(enrollmentId, examId);
    return { attemptId: attempt.id, startedAt: attempt.startedAt };
  }

  @Get(":attemptId")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "État d'une tentative: questions tirées (sans correction), réponses, échéance serveur" })
  async getAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("attemptId") attemptId: string,
  ) {
    await this.authorizeLearnerAttemptUseCase.assertAttemptOwned(attemptId, user.userId, tenantId);
    return this.getLearnerAttemptUseCase.getState(attemptId);
  }

  @Get(":attemptId/result")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Résultat d'une tentative soumise, selon la règle d'affichage du quiz (ENT-30)" })
  async getResult(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("attemptId") attemptId: string,
  ) {
    await this.authorizeLearnerAttemptUseCase.assertAttemptOwned(attemptId, user.userId, tenantId);
    return this.getLearnerAttemptUseCase.getResult(attemptId);
  }

  @Post(":attemptId/answers")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Enregistrer une réponse (UX-16, enregistrement automatique)" })
  async submitAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    await this.authorizeLearnerAttemptUseCase.assertAttemptOwned(attemptId, user.userId, tenantId);
    await this.submitAnswerUseCase.execute(attemptId, dto);
    return { attemptId };
  }

  @Post(":attemptId/submit")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Soumettre la tentative (RG-12, chronomètre serveur)" })
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("attemptId") attemptId: string,
  ) {
    await this.authorizeLearnerAttemptUseCase.assertAttemptOwned(attemptId, user.userId, tenantId);
    await this.submitAttemptUseCase.execute(attemptId);
    return { attemptId };
  }
}
