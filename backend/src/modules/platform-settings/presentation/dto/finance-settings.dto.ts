import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

import {
  FEE_BEARERS,
  MAX_PAYOUT_THRESHOLD,
  MAX_RETENTION_DAYS,
  PAYOUT_FREQUENCIES,
} from "../../domain/finance-settings";
import type { FeeBearer, PayoutFrequency } from "../../domain/finance-settings";

/** Tous les champs sont optionnels : seuls ceux fournis sont modifiés. Bornes revalidées par le domaine. */
export class UpdateFinanceSettingsDto {
  @ApiPropertyOptional({ minimum: 0, maximum: MAX_RETENTION_DAYS })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_RETENTION_DAYS)
  retentionDays?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PAYOUT_THRESHOLD)
  minimumPayoutThreshold?: number;

  @ApiPropertyOptional({ enum: PAYOUT_FREQUENCIES })
  @IsOptional()
  @IsIn(PAYOUT_FREQUENCIES)
  payoutFrequency?: PayoutFrequency;

  @ApiPropertyOptional({ enum: FEE_BEARERS })
  @IsOptional()
  @IsIn(FEE_BEARERS)
  transactionFeeBearer?: FeeBearer;
}
