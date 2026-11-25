import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

import { ResultsDisplay } from "../../domain/question-type";

/** ENT-28: règles de passage communes au quiz et à l'examen. */
export class SetQuizRulesDto {
  @ApiProperty({ example: 60, default: 60 })
  @IsInt()
  @Min(0)
  @Max(100)
  passingScorePercent!: number;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiProperty({ required: false, example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  delayBetweenAttemptsMinutes?: number;

  @ApiProperty({ required: false, example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  questionsToDraw?: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  shuffleQuestions!: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  shuffleAnswers!: boolean;

  @ApiProperty({ enum: ResultsDisplay, default: ResultsDisplay.SCORE_ONLY })
  @IsEnum(ResultsDisplay)
  resultsDisplay!: ResultsDisplay;

  @ApiProperty({ default: false })
  @IsBoolean()
  requireLiveAttendance!: boolean;

  @ApiProperty({ required: false, default: 1, description: "ENT-34 : poids dans la note finale de la formation" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  weight?: number;
}
