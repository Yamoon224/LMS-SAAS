import { CoursesFacade } from "@modules/courses/courses.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { GetEnrollmentUseCase } from "../application/get-enrollment.use-case";
import { ListEnrollmentsUseCase } from "../application/list-enrollments.use-case";
import { ManageEnrollmentUseCase } from "../application/manage-enrollment.use-case";
import { ManualEnrollUseCase } from "../application/manual-enroll.use-case";
import { RejectOfflinePaymentUseCase } from "../application/reject-offline-payment.use-case";
import { ResetProgressUseCase } from "../application/reset-progress.use-case";
import { ValidateOfflinePaymentUseCase } from "../application/validate-offline-payment.use-case";
import type { EnrollmentStatus } from "../domain/enrollment-status";
import type { Enrollment } from "../domain/enrollment.entity";
import { ProgressState } from "../domain/progress-state";
import { PROGRESS_REPOSITORY } from "../domain/progress.repository.port";
import type { ProgressRepositoryPort } from "../domain/progress.repository.port";

import { ExtendAccessDto } from "./dto/extend-access.dto";
import { ManualEnrollmentDto } from "./dto/manual-enrollment.dto";
import { RejectOfflinePaymentDto } from "./dto/reject-offline-payment.dto";
import { ValidateOfflinePaymentDto } from "./dto/validate-offline-payment.dto";

/** Inscription aplatie — même forme que les autres handlers de ce contrôleur. */
function toEnrollmentResponse(enrollment: Enrollment) {
  return {
    id: enrollment.id,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    status: enrollment.status,
    pricePaid: enrollment.pricePaid,
    expiresAt: enrollment.expiresAt,
    refusalReason: enrollment.refusalReason,
    manualEnrollmentNote: enrollment.manualEnrollmentNote,
  };
}

/** ENT-60 à ENT-64: liste des apprenants, validation des paiements hors plateforme, actions. */
@ApiTags("Entreprise / Apprenants")
@Controller("business/enrollments")
export class BusinessEnrollmentsController {
  constructor(
    private readonly listEnrollmentsUseCase: ListEnrollmentsUseCase,
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly validateOfflinePaymentUseCase: ValidateOfflinePaymentUseCase,
    private readonly manageEnrollmentUseCase: ManageEnrollmentUseCase,
    private readonly resetProgressUseCase: ResetProgressUseCase,
    private readonly manualEnrollUseCase: ManualEnrollUseCase,
    private readonly rejectOfflinePaymentUseCase: RejectOfflinePaymentUseCase,
    @Inject(PROGRESS_REPOSITORY) private readonly progressRepository: ProgressRepositoryPort,
    private readonly coursesFacade: CoursesFacade,
    private readonly usersFacade: UsersFacade,
  ) {}

  @Get()
  @RequirePermissions("learners.view")
  @ApiOperation({ summary: "Lister les inscrits d'une formation (ENT-60)" })
  async list(
    @CurrentTenant() tenantId: string,
    @Query("courseId") courseId: string,
    @Query("status") status?: EnrollmentStatus,
  ) {
    await this.coursesFacade.assertCourseInTenant(courseId, tenantId);
    const enrollments = await this.listEnrollmentsUseCase.listForCourse(courseId, status);
    // Une seule requête pour les apprenants de la page (pas de N appels).
    const users = await this.usersFacade.findManyByIds(enrollments.map((e) => e.userId));
    const userById = new Map(users.map((u) => [u.id, u]));
    return enrollments.map((e) => ({
      id: e.id,
      userId: e.userId,
      learnerName: userById.get(e.userId)?.fullName ?? null,
      email: userById.get(e.userId)?.email ?? null,
      status: e.status,
      pricePaid: e.pricePaid,
      expiresAt: e.expiresAt,
      refusalReason: e.refusalReason,
      manualEnrollmentNote: e.manualEnrollmentNote,
    }));
  }

  @Post("manual")
  @RequirePermissions("learners.manage")
  @ApiOperation({ summary: "Inscrire manuellement un apprenant, sans paiement (ENT-62)" })
  async enrollManually(
    @CurrentTenant() tenantId: string,
    @Body() dto: ManualEnrollmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { enrollment, invited } = await this.manualEnrollUseCase.execute({
      tenantId,
      courseId: dto.courseId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      reason: dto.reason,
      enrolledByUserId: user.userId,
    });
    return { ...toEnrollmentResponse(enrollment), invited };
  }

  @Get(":enrollmentId")
  @RequirePermissions("learners.view")
  @ApiOperation({ summary: "Fiche d'une inscription : statut, accès, progression (ENT-60)" })
  async findOne(@CurrentTenant() tenantId: string, @Param("enrollmentId") enrollmentId: string) {
    const enrollment = await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);

    const progress = await this.progressRepository.listByEnrollment(enrollmentId);
    const completedLessons = progress.filter((p) => p.state === ProgressState.COMPLETED).length;

    return {
      ...toEnrollmentResponse(enrollment),
      progress: {
        totalLessons: progress.length,
        completedLessons,
      },
    };
  }

  @Post(":enrollmentId/validate-offline-payment")
  @RequirePermissions("offline-payments.validate")
  @ApiOperation({ summary: "Valider un paiement hors plateforme (ENT-61/RG-07)" })
  async validateOfflinePayment(
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: ValidateOfflinePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
    await this.validateOfflinePaymentUseCase.execute({
      enrollmentId,
      reference: dto.reference,
      declaredAmount: dto.declaredAmount,
      validatedByUserId: user.userId,
    });
    return { enrollmentId, validated: true };
  }

  @Post(":enrollmentId/reject-offline")
  @RequirePermissions("offline-payments.validate")
  @ApiOperation({ summary: "Refuser un paiement hors plateforme, motif obligatoire (ENT-61)" })
  async rejectOfflinePayment(
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: RejectOfflinePaymentDto,
  ) {
    await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
    await this.rejectOfflinePaymentUseCase.execute({ enrollmentId, reason: dto.reason });
    return { enrollmentId, status: "REFUSED" };
  }

  @Post(":enrollmentId/suspend")
  @RequirePermissions("learners.manage")
  @ApiOperation({ summary: "Suspendre un apprenant (ENT-64)" })
  async suspend(@CurrentTenant() tenantId: string, @Param("enrollmentId") enrollmentId: string) {
    await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
    await this.manageEnrollmentUseCase.suspend(enrollmentId);
    return { enrollmentId, status: "SUSPENDED" };
  }

  @Post(":enrollmentId/reactivate")
  @RequirePermissions("learners.manage")
  @ApiOperation({ summary: "Réactiver un apprenant (ENT-64)" })
  async reactivate(@CurrentTenant() tenantId: string, @Param("enrollmentId") enrollmentId: string) {
    await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
    await this.manageEnrollmentUseCase.reactivate(enrollmentId);
    return { enrollmentId, status: "ACTIVE" };
  }

  @Post(":enrollmentId/extend-access")
  @RequirePermissions("learners.manage")
  @ApiOperation({ summary: "Prolonger l'accès (ENT-64)" })
  async extendAccess(
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: ExtendAccessDto,
  ) {
    await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
    await this.manageEnrollmentUseCase.extendAccess(enrollmentId, dto.additionalDays);
    return { enrollmentId };
  }

  @Post(":enrollmentId/reset-progress")
  @RequirePermissions("learners.manage")
  @ApiOperation({ summary: "Réinitialiser la progression (ENT-64)" })
  async resetProgress(@CurrentTenant() tenantId: string, @Param("enrollmentId") enrollmentId: string) {
    await this.getEnrollmentUseCase.executeInTenant(enrollmentId, tenantId);
    await this.resetProgressUseCase.execute(enrollmentId);
    return { enrollmentId, reset: true };
  }
}
