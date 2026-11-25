import { Module } from "@nestjs/common";

import {
  AcceptLegalDocumentUseCase,
  CreateLegalDraftUseCase,
  GetCurrentLegalDocumentUseCase,
  ListLegalDocumentsUseCase,
  ListPendingLegalDocumentsUseCase,
  PublishLegalDocumentUseCase,
  UpdateLegalDraftUseCase,
} from "./application/legal.use-cases";
import { LEGAL_REPOSITORY } from "./domain/legal.repository.port";
import { LegalPrismaRepository } from "./infrastructure/legal.prisma-repository";
import { AdminLegalController } from "./presentation/admin-legal.controller";
import { PublicLegalController } from "./presentation/public-legal.controller";

/** Pages légales de la plateforme : CGU, CGV, politique de confidentialité (ADM-41). */
@Module({
  controllers: [AdminLegalController, PublicLegalController],
  providers: [
    CreateLegalDraftUseCase,
    UpdateLegalDraftUseCase,
    PublishLegalDocumentUseCase,
    ListLegalDocumentsUseCase,
    ListPendingLegalDocumentsUseCase,
    GetCurrentLegalDocumentUseCase,
    AcceptLegalDocumentUseCase,
    { provide: LEGAL_REPOSITORY, useClass: LegalPrismaRepository },
  ],
})
export class LegalModule {}
