import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

/** ENT-34: règles de passage de l'examen final. */
export class SetExamRulesDto {
  @ApiProperty({ example: 60, default: 60 })
  @IsInt()
  @Min(0)
  passingScorePercent!: number;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiProperty({ required: false, example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  delayBetweenAttemptsMinutes?: number;

  @ApiProperty({ example: 60, default: 60 })
  @IsInt()
  @Min(1)
  timeLimitMinutes!: number;

  @ApiProperty({ required: false, example: 5, description: "ENT-34: tirage de N questions par module" })
  @IsOptional()
  @IsInt()
  @Min(1)
  questionsPerModule?: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  allowReentry!: boolean;

  @ApiProperty({ required: false, default: 1, description: "ENT-34 : poids dans la note finale de la formation" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  weight?: number;
}
