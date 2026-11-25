import { CoursesFacade } from "@modules/courses/courses.facade";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { NotFoundDomainError } from "@shared/errors";

import { CanAccessFinalExamUseCase } from "../application/can-access-final-exam.use-case";
import { EnrollInCourseUseCase } from "../application/enroll-in-course.use-case";
import { GetAccessibleModulesUseCase } from "../application/get-accessible-modules.use-case";
import { GetEnrollmentUseCase } from "../application/get-enrollment.use-case";
import { GetLearnerAssessmentOverviewUseCase } from "../application/get-learner-assessment-overview.use-case";
import { GetLearnerCourseContentUseCase } from "../application/get-learner-course-content.use-case";
import { GetLearnerLessonUseCase } from "../application/get-learner-lesson.use-case";
import { InitiateEnrollmentPaymentUseCase } from "../application/initiate-enrollment-payment.use-case";
import { ListLearnerCourseLocalesUseCase } from "../application/learner-content-locale.use-cases";
import { ListEnrollmentsUseCase } from "../application/list-enrollments.use-case";
import { RecordLessonViewUseCase } from "../application/record-lesson-view.use-case";

import { ContentLocaleQueryDto } from "./dto/content-locale-query.dto";
import { EnrollDto } from "./dto/enroll.dto";
import { PayEnrollmentDto } from "./dto/pay-enrollment.dto";
import { RecordLessonViewDto } from "./dto/record-lesson-view.dto";

/** PUB-04 à PUB-09: inscription, tableau de bord, lecteur de formation. */
@ApiTags("Plateforme publique / Inscriptions")
@Controller("public/enrollments")
export class PublicEnrollmentsController {
  constructor(
    private readonly enrollInCourseUseCase: EnrollInCourseUseCase,
    private readonly listEnrollmentsUseCase: ListEnrollmentsUseCase,
    private readonly recordLessonViewUseCase: RecordLessonViewUseCase,
    private readonly getAccessibleModulesUseCase: GetAccessibleModulesUseCase,
    private readonly canAccessFinalExamUseCase: CanAccessFinalExamUseCase,
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly coursesFacade: CoursesFacade,
    private readonly getLearnerCourseContentUseCase: GetLearnerCourseContentUseCase,
    private readonly getLearnerLessonUseCase: GetLearnerLessonUseCase,
    private readonly getLearnerAssessmentOverviewUseCase: GetLearnerAssessmentOverviewUseCase,
    private readonly initiateEnrollmentPaymentUseCase: InitiateEnrollmentPaymentUseCase,
    private readonly listLearnerCourseLocalesUseCase: ListLearnerCourseLocalesUseCase,
  ) {}

  @Post()
  @RequirePermissions("learner.enroll")
  @ApiOperation({ summary: "S'inscrire à une formation (PUB-04/ENT-62)" })
  async enroll(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Body() dto: EnrollDto,
  ) {
    const enrollment = await this.enrollInCourseUseCase.execute({ userId: user.userId, tenantId, ...dto });
    return { id: enrollment.id, status: enrollment.status, pricePaid: enrollment.pricePaid };
  }

  @Get("my")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Tableau de bord: mes formations (PUB-05)" })
  async myEnrollments(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tenantId: string) {
    const enrollments = await this.listEnrollmentsUseCase.listForUser(user.userId);
    // Une seule requête pour les formations (titre, couverture): pas de N appels côté client.
    const courses = await this.coursesFacade.findManyInTenant(
      enrollments.map((e) => e.courseId),
      tenantId,
    );
    const courseById = new Map(courses.map((course) => [course.id, course]));
    return enrollments.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      status: e.status,
      pricePaid: e.pricePaid,
      currency: e.currency,
      expiresAt: e.expiresAt,
      completedAt: e.completedAt,
      courseTitle: courseById.get(e.courseId)?.title ?? null,
      courseCoverImageUrl: courseById.get(e.courseId)?.coverImageUrl ?? null,
    }));
  }

  @Post(":enrollmentId/pay")
  @RequirePermissions("learner.enroll")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Payer en ligne une inscription en attente (PUB-07, montant figé serveur)" })
  async pay(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: PayEnrollmentDto,
  ) {
    return this.initiateEnrollmentPaymentUseCase.execute({
      enrollmentId,
      userId: user.userId,
      tenantId,
      method: dto.method,
    });
  }

  @Get(":enrollmentId/course-content")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Programme: modules (accès/validation) et leçons (progression), sans contenu (PUB-09)" })
  async courseContent(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Query() query: ContentLocaleQueryDto,
  ) {
    return this.getLearnerCourseContentUseCase.execute(enrollmentId, user.userId, tenantId, query.locale);
  }

  @Get(":enrollmentId/locales")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Langues dans lesquelles lire la formation : origine + traductions publiées (PUB-17)" })
  async locales(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    return this.listLearnerCourseLocalesUseCase.execute(enrollmentId, user.userId, tenantId);
  }

  @Get(":enrollmentId/lessons/:lessonId")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Contenu d'une leçon (HTML assaini, URL signée du média) (PUB-09)" })
  async lesson(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("lessonId") lessonId: string,
    @Query() query: ContentLocaleQueryDto,
  ) {
    return this.getLearnerLessonUseCase.execute(enrollmentId, lessonId, user.userId, tenantId, query.locale);
  }

  @Get(":enrollmentId/modules/:moduleId/quiz")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Fiche du quiz d'un module: règles, tentatives, démarrage possible (PUB-10)" })
  async quizOverview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("moduleId") moduleId: string,
  ) {
    return this.getLearnerAssessmentOverviewUseCase.forModuleQuiz(enrollmentId, moduleId, user.userId, tenantId);
  }

  @Get(":enrollmentId/exam")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Fiche de l'examen final: règles, tentatives, démarrage possible (PUB-11)" })
  async examOverview(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    return this.getLearnerAssessmentOverviewUseCase.forExam(enrollmentId, user.userId, tenantId);
  }

  @Post(":enrollmentId/lessons/:lessonId/view")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Suivi de consultation d'une leçon (PUB-09/ENT-25)" })
  async recordView(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: RecordLessonViewDto,
  ) {
    // Propriété + leçon de la formation de CETTE inscription (404 sinon, plus d'erreur FK) + module déverrouillé (RG-09).
    await this.getLearnerLessonUseCase.authorize(enrollmentId, lessonId, user.userId, tenantId, false);
    await this.recordLessonViewUseCase.execute(enrollmentId, lessonId, dto.watchedPercent);
    return { enrollmentId, lessonId };
  }

  @Get(":enrollmentId/courses/:courseId/modules-access")
  @RequirePermissions("learner.take-lesson")
  @ApiOperation({ summary: "Modules accessibles et verrouillés (RG-09/UX-14)" })
  async modulesAccess(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("courseId") courseId: string,
  ) {
    await this.assertOwnedEnrollmentOnCourse(enrollmentId, courseId, user.userId, tenantId);
    const course = await this.coursesFacade.findByIdInTenant(courseId, tenantId);
    return this.getAccessibleModulesUseCase.execute(enrollmentId, courseId, course.progressionMode);
  }

  @Get(":enrollmentId/courses/:courseId/exam-access")
  @RequirePermissions("learner.take-assessment")
  @ApiOperation({ summary: "Accès à l'examen final conditionné à la validation des modules (RG-12)" })
  async examAccess(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("courseId") courseId: string,
  ) {
    await this.assertOwnedEnrollmentOnCourse(enrollmentId, courseId, user.userId, tenantId);
    const canAccess = await this.canAccessFinalExamUseCase.execute(enrollmentId, courseId);
    return { canAccess };
  }

  /** Inscription de l'appelant, dans son tenant, ET portant bien sur `courseId` (404 uniforme sinon). */
  private async assertOwnedEnrollmentOnCourse(
    enrollmentId: string,
    courseId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(enrollmentId, userId, tenantId);
    if (enrollment.courseId !== courseId) {
      throw new NotFoundDomainError(`Inscription introuvable: ${enrollmentId}`);
    }
  }
}
