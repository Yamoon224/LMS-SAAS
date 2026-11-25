import { Module } from "@nestjs/common";

import { DeleteMyAccountUseCase } from "./application/delete-my-account.use-case";
import { ExportMyDataUseCase } from "./application/export-my-data.use-case";
import { PurgeExpiredPersonalDataUseCase } from "./application/purge-expired-personal-data.use-case";
import { PRIVACY_REPOSITORY } from "./domain/privacy.repository.port";
import { PrivacyPrismaRepository } from "./infrastructure/privacy.prisma-repository";
import { PublicPrivacyController } from "./presentation/public-privacy.controller";
import { PrivacyScheduler } from "./privacy.scheduler";

/** Section 11 / loi 2013-450 : export, effacement (anonymisation) et durées de conservation des données apprenant. */
@Module({
  controllers: [PublicPrivacyController],
  providers: [
    ExportMyDataUseCase,
    DeleteMyAccountUseCase,
    PurgeExpiredPersonalDataUseCase,
    PrivacyScheduler,
    { provide: PRIVACY_REPOSITORY, useClass: PrivacyPrismaRepository },
  ],
})
export class PrivacyModule {}
