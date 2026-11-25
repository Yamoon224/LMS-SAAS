import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  GetAttestationDownloadUrlUseCase,
  ListAttestationsUseCase,
  RevokeAttestationUseCase,
} from "../application/attestation.use-cases";

import { RevokeCertificateDto } from "./dto/revoke-certificate.dto";

/** ENT-44: attestations de suivi délivrées par l'entreprise, téléchargement, révocation motivée. */
@ApiTags("Entreprise / Attestations de suivi")
@Controller("business/attestations")
export class BusinessAttestationsController {
  constructor(
    private readonly listAttestationsUseCase: ListAttestationsUseCase,
    private readonly downloadUrlUseCase: GetAttestationDownloadUrlUseCase,
    private readonly revokeAttestationUseCase: RevokeAttestationUseCase,
  ) {}

  @Get()
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Lister les attestations de suivi délivrées (ENT-44)" })
  async list(@CurrentTenant() tenantId: string) {
    const attestations = await this.listAttestationsUseCase.listForTenant(tenantId);
    return attestations.map((attestation) => ({
      id: attestation.id,
      number: attestation.number,
      status: attestation.status,
      learnerName: attestation.learnerNameSnapshot,
      courseTitle: attestation.courseTitleSnapshot,
      progressPercent: attestation.progressPercent,
      issuedAt: attestation.issuedAt,
      revocationReason: attestation.revocationReason,
    }));
  }

  @Get(":attestationId/download-url")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "URL signée de téléchargement du PDF de l'attestation" })
  async downloadUrl(@CurrentTenant() tenantId: string, @Param("attestationId") attestationId: string) {
    return { url: await this.downloadUrlUseCase.executeForTenant(attestationId, tenantId) };
  }

  @Post(":attestationId/revoke")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Révoquer une attestation, motif obligatoire (ENT-44)" })
  async revoke(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("attestationId") attestationId: string,
    @Body() dto: RevokeCertificateDto,
  ) {
    await this.revokeAttestationUseCase.execute(attestationId, tenantId, dto.reason, user.userId);
    return { attestationId, status: "REVOKED" };
  }
}
