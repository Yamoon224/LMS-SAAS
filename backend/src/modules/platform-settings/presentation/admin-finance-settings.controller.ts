import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequirePermissions } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import {
  GetFinanceSettingsUseCase,
  ListFinanceSettingsHistoryUseCase,
  UpdateFinanceSettingsUseCase,
} from "../application/finance-settings.use-cases";
import { DEFAULT_FINANCE_SETTINGS, MAX_PAYOUT_THRESHOLD, MAX_RETENTION_DAYS } from "../domain/finance-settings";

import { UpdateFinanceSettingsDto } from "./dto/finance-settings.dto";

/** ADM-21/ADM-23 : paramètres financiers de la plateforme (rétention, seuil, fréquence, frais). */
@ApiTags("Admin / Finances")
@Controller("admin/finance-settings")
export class AdminFinanceSettingsController {
  constructor(
    private readonly getFinanceSettingsUseCase: GetFinanceSettingsUseCase,
    private readonly updateFinanceSettingsUseCase: UpdateFinanceSettingsUseCase,
    private readonly listHistoryUseCase: ListFinanceSettingsHistoryUseCase,
  ) {}

  @Get()
  @RequirePermissions("finance-settings.manage")
  @ApiOperation({ summary: "Paramètres financiers en vigueur, bornes et valeurs par défaut" })
  async get() {
    return {
      settings: await this.getFinanceSettingsUseCase.execute(),
      defaults: DEFAULT_FINANCE_SETTINGS,
      limits: { maxRetentionDays: MAX_RETENTION_DAYS, maxPayoutThreshold: MAX_PAYOUT_THRESHOLD },
    };
  }

  @Put()
  @RequirePermissions("finance-settings.manage")
  @ApiOperation({ summary: "Modifier des paramètres financiers (ventes futures uniquement, audité)" })
  async update(@Body() dto: UpdateFinanceSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return { settings: await this.updateFinanceSettingsUseCase.execute({ ...dto }, user.userId) };
  }

  @Get("history")
  @RequirePermissions("finance-settings.manage")
  @ApiOperation({ summary: "Historique des changements de paramètres" })
  history() {
    return this.listHistoryUseCase.execute();
  }
}
