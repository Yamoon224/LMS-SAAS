import { Controller, Get, Param, StreamableFile } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@shared/decorators";

import { PreviewIssuedCertificateUseCase } from "../application/preview-issued-certificate.use-case";

/** ADM-31 : consultation des certificats délivrés, toutes entreprises confondues (lecture seule). */
@ApiTags("Admin / Certificats")
@Controller("admin/certificates")
export class AdminCertificatesController {
  constructor(private readonly previewIssuedCertificate: PreviewIssuedCertificateUseCase) {}

  @Get(":number/preview")
  @RequirePermissions("analytics.view")
  @ApiOperation({ summary: "Aperçu PDF d'un certificat délivré, recomposé depuis ses données figées et le design de son modèle" })
  async preview(@Param("number") number: string) {
    const pdf = await this.previewIssuedCertificate.execute(number);
    return new StreamableFile(pdf, { type: "application/pdf", disposition: `inline; filename="certificat-${encodeURIComponent(number)}.pdf"` });
  }
}
