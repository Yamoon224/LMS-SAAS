import { Module } from "@nestjs/common";

import {
  GetFinanceSettingsUseCase,
  ListFinanceSettingsHistoryUseCase,
  UpdateFinanceSettingsUseCase,
} from "./application/finance-settings.use-cases";
import { PLATFORM_SETTING_REPOSITORY } from "./domain/platform-setting.repository.port";
import { PlatformSettingPrismaRepository } from "./infrastructure/platform-setting.prisma-repository";
import { PlatformSettingsFacade } from "./platform-settings.facade";
import { AdminFinanceSettingsController } from "./presentation/admin-finance-settings.controller";

/** Paramètres financiers configurables par l'Admin (ADM-21, ADM-23), versionnés par date d'effet. */
@Module({
  controllers: [AdminFinanceSettingsController],
  providers: [
    GetFinanceSettingsUseCase,
    UpdateFinanceSettingsUseCase,
    ListFinanceSettingsHistoryUseCase,
    PlatformSettingsFacade,
    { provide: PLATFORM_SETTING_REPOSITORY, useClass: PlatformSettingPrismaRepository },
  ],
  exports: [PlatformSettingsFacade],
})
export class PlatformSettingsModule {}
