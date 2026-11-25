import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min } from "class-validator";

import type { PlanFeatures, PlanQuotas } from "../../domain/plan-quotas";

export class CreatePlanDto {
  @ApiProperty({ example: "Starter" })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPublic!: boolean;

  @ApiProperty({
    example: { maxCourses: 10, maxActiveLearners: 200, maxManagers: 3, storageGb: 20, liveSessionsPerMonth: 4 },
  })
  @IsObject()
  quotas!: PlanQuotas;

  @ApiProperty({ example: { aiTranslation: true, customCertificates: false } })
  @IsObject()
  features!: PlanFeatures;

  @ApiProperty({ required: false, example: 10, description: "Taux de commission par défaut (%)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRatePercent?: number;
}
