import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";

import { ResourceType } from "../../domain/resource-type";

import { CompletionCriteriaDto } from "./completion-criteria.dto";

export class CreateLessonDto {
  @ApiProperty({ example: "Leçon 1 — Présentation" })
  @IsString()
  @Length(2, 200)
  title!: string;

  @ApiProperty({ enum: ResourceType, default: ResourceType.TEXT })
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @ApiProperty({ required: false, description: "Contenu CKEditor (ENT-23), nettoyé côté serveur" })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiProperty({ required: false, description: "URL de stockage pour PDF/audio/vidéo/image (ENT-24)" })
  @IsOptional()
  @IsString()
  storageUrl?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isMandatory!: boolean;

  @ApiProperty({ required: false, type: CompletionCriteriaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompletionCriteriaDto)
  completionCriteria?: CompletionCriteriaDto;

  @ApiProperty({ default: false, description: "Téléchargement autorisé (ENT-24)" })
  @IsBoolean()
  downloadAllowed!: boolean;
}
