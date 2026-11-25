import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";

import { CourseType, ProgressionMode } from "../../domain/course-type";

export class CreateCourseDto {
  @ApiProperty({ example: "Introduction à la comptabilité" })
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  subtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CourseType, default: CourseType.CERTIFYING })
  @IsEnum(CourseType)
  type!: CourseType;

  @ApiProperty({ enum: ProgressionMode, default: ProgressionMode.SEQUENTIAL })
  @IsEnum(ProgressionMode)
  progressionMode!: ProgressionMode;

  @ApiProperty({ example: "fr", default: "fr" })
  @IsString()
  @Length(2, 5)
  sourceLocale!: string;

  @ApiProperty({ example: 25000, description: "0 = gratuit" })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiProperty({ example: "XOF", default: "XOF" })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ required: false, description: "Durée d'accès en jours ; absent = illimité" })
  @IsOptional()
  @IsInt()
  @Min(1)
  accessDurationDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  instructorIds!: string[];
}
