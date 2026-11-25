import { AssessmentsModule } from "@modules/assessments/assessments.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { EnrollmentsModule } from "@modules/enrollments/enrollments.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { UsersModule } from "@modules/users/users.module";
import { Module } from "@nestjs/common";

import {
  ManageCertificateLibraryUseCase,
  PreviewCertificateDesignUseCase,
  UseCertificateLibraryTemplateUseCase,
} from "./application/certificate-library.use-cases";
import { CreateCertificateTemplateUseCase } from "./application/create-certificate-template.use-case";
import { GetCertificateDownloadUrlUseCase } from "./application/get-certificate-download-url.use-case";
import { PreviewIssuedCertificateUseCase } from "./application/preview-issued-certificate.use-case";
import { GetCertificateUseCase } from "./application/get-certificate.use-case";
import { IssueCertificateUseCase } from "./application/issue-certificate.use-case";
import { ListCertificateTemplatesUseCase } from "./application/list-certificate-templates.use-case";
import { ListCertificatesUseCase } from "./application/list-certificates.use-case";
import { ReissueCertificateUseCase } from "./application/reissue-certificate.use-case";
import { RevokeCertificateUseCase } from "./application/revoke-certificate.use-case";
import { VerifyCertificateUseCase } from "./application/verify-certificate.use-case";
import { CertificatesFacade } from "./certificates.facade";
import { ATTESTATION_PDF_RENDERER } from "./domain/attestation-pdf-renderer.port";
import { ATTESTATION_REPOSITORY } from "./domain/attestation.repository.port";
import { AttestationPrismaRepository } from "./infrastructure/attestation.prisma-repository";
import { PdfKitAttestationRendererAdapter } from "./infrastructure/pdfkit-attestation-renderer.adapter";
import { BusinessAttestationsController } from "./presentation/business-attestations.controller";
import { PublicAttestationsController } from "./presentation/public-attestations.controller";
import {
  GetAttestationDownloadUrlUseCase,
  ListAttestationsUseCase,
  RevokeAttestationUseCase,
  VerifyAttestationUseCase,
} from "./application/attestation.use-cases";
import { IssueAttestationUseCase } from "./application/issue-attestation.use-case";
import { CERTIFICATE_LIBRARY_REPOSITORY } from "./domain/certificate-library.repository.port";
import { CERTIFICATE_PDF_RENDERER } from "./domain/certificate-pdf-renderer.port";
import { CERTIFICATE_STORAGE } from "./domain/certificate-storage.port";
import { CERTIFICATE_TEMPLATE_REPOSITORY } from "./domain/certificate-template.repository.port";
import { CERTIFICATE_REPOSITORY } from "./domain/certificate.repository.port";
import { CertificateLibraryPrismaRepository } from "./infrastructure/certificate-library.prisma-repository";
import { CertificateTemplatePrismaRepository } from "./infrastructure/certificate-template.prisma-repository";
import { CertificatePrismaRepository } from "./infrastructure/certificate.prisma-repository";
import { PdfKitCertificateRendererAdapter } from "./infrastructure/pdfkit-certificate-renderer.adapter";
import { S3CertificateStorageAdapter } from "./infrastructure/s3-certificate-storage.adapter";
import { AdminCertificatesController } from "./presentation/admin-certificates.controller";
import { AdminCertificateLibraryController } from "./presentation/admin-certificate-library.controller";
import { BusinessCertificateLibraryController } from "./presentation/business-certificate-library.controller";
import { BusinessCertificatesController } from "./presentation/business-certificates.controller";
import { PublicCertificatesController } from "./presentation/public-certificates.controller";

@Module({
  imports: [CoursesModule, UsersModule, TenantsModule, AssessmentsModule, EnrollmentsModule],
  controllers: [
    BusinessCertificatesController,
    BusinessAttestationsController,
    PublicAttestationsController,
    PublicCertificatesController,
    AdminCertificateLibraryController,
    AdminCertificatesController,
    BusinessCertificateLibraryController,
  ],
  providers: [
    IssueCertificateUseCase,
    IssueAttestationUseCase,
    ListAttestationsUseCase,
    GetAttestationDownloadUrlUseCase,
    RevokeAttestationUseCase,
    VerifyAttestationUseCase,
    RevokeCertificateUseCase,
    ReissueCertificateUseCase,
    GetCertificateUseCase,
    ListCertificatesUseCase,
    VerifyCertificateUseCase,
    GetCertificateDownloadUrlUseCase,
    CreateCertificateTemplateUseCase,
    ListCertificateTemplatesUseCase,
    ManageCertificateLibraryUseCase,
    PreviewCertificateDesignUseCase,
    PreviewIssuedCertificateUseCase,
    UseCertificateLibraryTemplateUseCase,
    CertificatesFacade,
    { provide: CERTIFICATE_REPOSITORY, useClass: CertificatePrismaRepository },
    { provide: ATTESTATION_REPOSITORY, useClass: AttestationPrismaRepository },
    { provide: ATTESTATION_PDF_RENDERER, useClass: PdfKitAttestationRendererAdapter },
    { provide: CERTIFICATE_LIBRARY_REPOSITORY, useClass: CertificateLibraryPrismaRepository },
    { provide: CERTIFICATE_TEMPLATE_REPOSITORY, useClass: CertificateTemplatePrismaRepository },
    { provide: CERTIFICATE_PDF_RENDERER, useClass: PdfKitCertificateRendererAdapter },
    { provide: CERTIFICATE_STORAGE, useClass: S3CertificateStorageAdapter },
  ],
  exports: [CertificatesFacade],
})
export class CertificatesModule {}
