import { Module } from "@nestjs/common";

import {
  ListIntegrationsUseCase,
  ResetIntegrationUseCase,
  ResolveIntegrationUseCase,
  SaveIntegrationUseCase,
  TestSmtpIntegrationUseCase,
} from "./application/integrations.use-cases";
import { INTEGRATION_SETTING_REPOSITORY } from "./domain/integration-setting.repository.port";
import { SMTP_TESTER } from "./domain/smtp-tester.port";
import { IntegrationSettingPrismaRepository } from "./infrastructure/integration-setting.prisma-repository";
import { NodemailerSmtpTesterAdapter } from "./infrastructure/nodemailer-smtp-tester.adapter";
import { IntegrationsFacade } from "./integrations.facade";
import { AdminIntegrationsController } from "./presentation/admin-integrations.controller";

/** Intégrations de la plateforme configurables par l'Admin (ADM-37) : fournisseurs externes, secrets chiffrés. */
@Module({
  controllers: [AdminIntegrationsController],
  providers: [
    ResolveIntegrationUseCase,
    ListIntegrationsUseCase,
    SaveIntegrationUseCase,
    ResetIntegrationUseCase,
    TestSmtpIntegrationUseCase,
    IntegrationsFacade,
    { provide: INTEGRATION_SETTING_REPOSITORY, useClass: IntegrationSettingPrismaRepository },
    { provide: SMTP_TESTER, useClass: NodemailerSmtpTesterAdapter },
  ],
  exports: [IntegrationsFacade],
})
export class IntegrationsModule {}
