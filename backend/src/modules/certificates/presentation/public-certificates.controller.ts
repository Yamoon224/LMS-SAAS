import { EnrollmentsFacade } from "@modules/enrollments/enrollments.facade";
import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, CurrentUser, Public, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";
import { NotFoundDomainError } from "@shared/errors";

import { GetCertificateDownloadUrlUseCase } from "../application/get-certificate-download-url.use-case";
import { GetCertificateUseCase } from "../application/get-certificate.use-case";
import { VerifyAttestationUseCase } from "../application/attestation.use-cases";
import { VerifyCertificateUseCase } from "../application/verify-certificate.use-case";
import { isAttestationNumber } from "../domain/attestation-number";

/** PUB-xx/ENT-45: accès apprenant à son certificat (RG-17) et vérification publique par QR code. */
@ApiTags("Plateforme publique / Certificats")
@Controller("public/certificates")
export class PublicCertificatesController {
  constructor(
    private readonly getCertificateUseCase: GetCertificateUseCase,
    private readonly getCertificateDownloadUrlUseCase: GetCertificateDownloadUrlUseCase,
    private readonly verifyCertificateUseCase: VerifyCertificateUseCase,
    private readonly verifyAttestationUseCase: VerifyAttestationUseCase,
    private readonly enrollmentsFacade: EnrollmentsFacade,
  ) {}

  @Get("by-enrollment/:enrollmentId")
  @RequirePermissions("learner.view-own-enrollments")
  @ApiOperation({ summary: "Certificat d'une inscription, accessible même après expiration du contenu (RG-17)" })
  async byEnrollment(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Param("enrollmentId") enrollmentId: string,
  ) {
    // Anti-IDOR: l'inscription doit appartenir à l'apprenant connecté, dans son tenant (404 uniforme sinon).
    await this.enrollmentsFacade.findOwnedByUser(enrollmentId, user.userId, tenantId);
    const certificate = await this.getCertificateUseCase.executeForEnrollment(enrollmentId);
    if (!certificate) {
      throw new NotFoundDomainError("Aucun certificat délivré pour cette inscription.");
    }

    const downloadUrl = await this.getCertificateDownloadUrlUseCase.execute(certificate.id);
    return {
      id: certificate.id,
      number: certificate.number,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      downloadUrl,
    };
  }

  @Get("verify/:number")
  @Public()
  @ApiOperation({ summary: "Vérification publique d'un certificat par numéro (ENT-45, lien du QR code)" })
  async verify(@Param("number") number: string) {
    // ENT-44: un numéro ATT-... désigne une attestation de suivi ; la réponse porte `type` pour distinguer.
    if (isAttestationNumber(number)) return this.verifyAttestationUseCase.execute(number);
    return { type: "CERTIFICATE" as const, ...(await this.verifyCertificateUseCase.execute(number)) };
  }
}
