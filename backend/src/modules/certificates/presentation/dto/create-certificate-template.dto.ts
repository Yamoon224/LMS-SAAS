import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, Length, ValidateNested } from "class-validator";

import { CertificateDesignDto } from "./certificate-design.dto";

export class CreateCertificateTemplateDto {
  @ApiProperty({ example: "Modèle par défaut" })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiProperty({ type: CertificateDesignDto })
  @ValidateNested()
  @Type(() => CertificateDesignDto)
  design!: CertificateDesignDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
