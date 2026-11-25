import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

/** ENT-25: critère de consultation d'un contenu obligatoire. */
export class CompletionCriteriaDto {
  @ApiProperty({ required: false, example: 90, description: "Pourcentage vidéo/audio requis" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  watchedPercent?: number;

  @ApiProperty({ required: false, description: "PDF/document: simple ouverture suffit" })
  @IsOptional()
  @IsBoolean()
  requiresOpen?: boolean;
}
