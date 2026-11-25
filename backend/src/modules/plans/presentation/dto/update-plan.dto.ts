import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, Length, MaxLength } from "class-validator";

import type { PlanFeatures, PlanQuotas } from "../../domain/plan-quotas";

/** ADM-13 : tous les champs sont optionnels (mise à jour partielle) ; le prix n'est pas modifiable ici. */
export class UpdatePlanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  quotas?: PlanQuotas;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  features?: PlanFeatures;
}
