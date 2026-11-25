import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, Length, MaxLength, ValidateNested } from "class-validator";

import { LIBRARY_NAME_MAX, LIBRARY_NAME_MIN } from "../../domain/certificate-library";

import { CertificateDesignDto } from "./certificate-design.dto";

export class SaveLibraryTemplateDto {
  @ApiProperty({ example: "Classique bleu" })
  @IsString()
  @Length(LIBRARY_NAME_MIN, LIBRARY_NAME_MAX)
  name!: string;

  @ApiPropertyOptional({ example: "Sobre, police à empattements, bordure double." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ type: CertificateDesignDto })
  @ValidateNested()
  @Type(() => CertificateDesignDto)
  design!: CertificateDesignDto;
}

export class PreviewDesignDto {
  @ApiProperty({ type: CertificateDesignDto })
  @ValidateNested()
  @Type(() => CertificateDesignDto)
  design!: CertificateDesignDto;
}

export class InstallLibraryTemplateDto {
  @ApiPropertyOptional({ default: false, description: "Définir la copie comme modèle par défaut de l'entreprise" })
  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}
