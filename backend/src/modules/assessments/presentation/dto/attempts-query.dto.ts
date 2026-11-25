import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { MAX_PAGE_SIZE } from "../../domain/attempt-query";
import { AttemptStatus } from "../../domain/question-type";

/** ENT-37 : filtres de la liste des tentatives (query string). */
export class AttemptsQueryDto {
  @ApiProperty({ required: false, description: "Nom ou e-mail de l'apprenant" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  learner?: string;

  @ApiProperty({ required: false, enum: AttemptStatus })
  @IsOptional()
  @IsEnum(AttemptStatus)
  status?: AttemptStatus;

  @ApiProperty({ required: false, description: "Date de début minimale (ISO 8601)" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiProperty({ required: false, description: "Date de début maximale (ISO 8601)" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
