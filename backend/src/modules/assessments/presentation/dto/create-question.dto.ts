import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from "class-validator";

import { QuestionType } from "../../domain/question-type";

export class CreateOptionDto {
  @ApiProperty({ example: "Paris" })
  @IsString()
  @Length(1, 500)
  label!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiProperty({ example: "Quelle est la capitale de la France ?" })
  @IsString()
  statementHtml!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  points!: number;

  @ApiProperty({ type: [CreateOptionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  @ArrayMinSize(2)
  options!: CreateOptionDto[];
}
