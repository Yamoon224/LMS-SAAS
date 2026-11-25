import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentTenant, RequirePermissions } from "@shared/decorators";

import { CreateCertificateTemplateUseCase } from "../application/create-certificate-template.use-case";
import { GetCertificateDownloadUrlUseCase } from "../application/get-certificate-download-url.use-case";
import { ListCertificateTemplatesUseCase } from "../application/list-certificate-templates.use-case";
import { ListCertificatesUseCase } from "../application/list-certificates.use-case";
import { ReissueCertificateUseCase } from "../application/reissue-certificate.use-case";
import { RevokeCertificateUseCase } from "../application/revoke-certificate.use-case";

import { CreateCertificateTemplateDto } from "./dto/create-certificate-template.dto";
import { RevokeCertificateDto } from "./dto/revoke-certificate.dto";

/** ENT-38 à ENT-44: modèles de certificat, liste des certificats émis, révocation, réémission. */
@ApiTags("Entreprise / Certificats")
@Controller("business/certificates")
export class BusinessCertificatesController {
  constructor(
    private readonly listCertificatesUseCase: ListCertificatesUseCase,
    private readonly revokeCertificateUseCase: RevokeCertificateUseCase,
    private readonly reissueCertificateUseCase: ReissueCertificateUseCase,
    private readonly getCertificateDownloadUrlUseCase: GetCertificateDownloadUrlUseCase,
    private readonly createCertificateTemplateUseCase: CreateCertificateTemplateUseCase,
    private readonly listCertificateTemplatesUseCase: ListCertificateTemplatesUseCase,
  ) {}

  @Get()
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Lister les certificats émis (ENT-42/ENT-43)" })
  async list(@CurrentTenant() tenantId: string) {
    const certificates = await this.listCertificatesUseCase.listForTenant(tenantId);
    return certificates.map((certificate) => ({
      id: certificate.id,
      number: certificate.number,
      status: certificate.status,
      learnerName: certificate.learnerNameSnapshot,
      courseTitle: certificate.courseTitleSnapshot,
      scorePercent: certificate.scorePercent,
      issuedAt: certificate.issuedAt,
      revocationReason: certificate.revocationReason,
    }));
  }

  @Get(":certificateId/download-url")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "URL signée de téléchargement du PDF" })
  async downloadUrl(@CurrentTenant() tenantId: string, @Param("certificateId") certificateId: string) {
    const url = await this.getCertificateDownloadUrlUseCase.execute(certificateId, tenantId);
    return { url };
  }

  @Post(":certificateId/revoke")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Révoquer un certificat, motif obligatoire (ENT-44)" })
  async revoke(
    @CurrentTenant() tenantId: string,
    @Param("certificateId") certificateId: string,
    @Body() dto: RevokeCertificateDto,
  ) {
    await this.revokeCertificateUseCase.execute(certificateId, tenantId, dto.reason);
    return { certificateId, status: "REVOKED" };
  }

  @Post(":certificateId/reissue")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Réémettre un certificat (ENT-44)" })
  async reissue(@CurrentTenant() tenantId: string, @Param("certificateId") certificateId: string) {
    const reissued = await this.reissueCertificateUseCase.execute(certificateId, tenantId);
    return { id: reissued.id, number: reissued.number };
  }

  @Post("templates")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Créer un modèle de certificat (ENT-38)" })
  async createTemplate(@CurrentTenant() tenantId: string, @Body() dto: CreateCertificateTemplateDto) {
    const template = await this.createCertificateTemplateUseCase.execute({
      tenantId,
      name: dto.name,
      design: dto.design,
      isDefault: dto.isDefault ?? false,
    });
    return { id: template.id, name: template.name, isDefault: template.isDefault };
  }

  @Get("templates")
  @RequirePermissions("certificates.manage")
  @ApiOperation({ summary: "Lister les modèles de certificat (ENT-38)" })
  async listTemplates(@CurrentTenant() tenantId: string) {
    const templates = await this.listCertificateTemplatesUseCase.execute(tenantId);
    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      isDefault: template.isDefault,
    }));
  }
}
