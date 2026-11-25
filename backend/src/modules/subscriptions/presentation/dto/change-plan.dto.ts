import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString } from "class-validator";

export class ChangePlanDto {
  @ApiProperty({ description: "Identifiant de la nouvelle PlanPrice" })
  @IsString()
  newPlanPriceId!: string;

  @ApiProperty({ description: "true pour une montée en gamme, false pour une descente" })
  @IsBoolean()
  isUpgrade!: boolean;
}
