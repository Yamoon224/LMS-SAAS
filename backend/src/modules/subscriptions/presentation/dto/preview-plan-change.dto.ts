import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class PreviewPlanChangeQueryDto {
  @ApiProperty({ description: "Identifiant de la PlanPrice cible" })
  @IsString()
  @MinLength(1)
  newPlanPriceId!: string;
}
