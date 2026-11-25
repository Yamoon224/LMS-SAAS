import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { GetAttestationDownloadUrlUseCase, ListAttestationsUseCase } from "../application/attestation.use-cases";

/** ENT-44: accès de l'apprenant à ses attestations de suivi (liste, téléchargement). */
@ApiTags("Plateforme publique / Attestations de suivi")
@Controller("public/attestations")
export class PublicAttestationsController {
  constructor(
    private readonly listAttestationsUseCase: ListAttestationsUseCase,
    private readonly downloadUrlUseCase: GetAttestationDownloadUrlUseCase,
  ) {}

  @Get("mine")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Mes attestations de suivi" })
  async mine(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tenantId: string) {
    const attestations = await this.listAttestationsUseCase.listForLearner(user.userId, tenantId);
    return attestations.map((attestation) => ({
      id: attestation.id,
      number: attestation.number,
      status: attestation.status,
      courseTitle: attestation.courseTitleSnapshot,
      progressPercent: attestation.progressPercent,
      durationMinutes: attestation.durationMinutes,
      startedAt: attestation.startedAt,
      endedAt: attestation.endedAt,
      issuedAt: attestation.issuedAt,
    }));
  }

  @Get(":attestationId/download-url")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "URL signée de téléchargement de mon attestation" })
  async downloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("attestationId") attestationId: string,
  ) {
    return { url: await this.downloadUrlUseCase.executeForLearner(attestationId, user.userId, tenantId) };
  }
}
