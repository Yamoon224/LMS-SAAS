import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsString, Length, Min } from "class-validator";

import { BillingPeriod } from "../../domain/billing-period";

export class SetPlanPriceDto {
  @ApiProperty({ enum: BillingPeriod })
  @IsEnum(BillingPeriod)
  period!: BillingPeriod;

  @ApiProperty({ example: "XOF", default: "XOF" })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ example: 25000, description: "Montant en plus petite unité de la devise (BE-07)" })
  @IsInt()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 14, default: 0 })
  @IsInt()
  @Min(0)
  trialDays!: number;
}
