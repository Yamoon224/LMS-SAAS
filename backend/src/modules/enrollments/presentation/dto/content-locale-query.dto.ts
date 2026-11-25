import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

/**
 * PUB-17 : langue de lecture demandée. Une valeur non disponible n'est pas une erreur (le serveur retombe sur la
 * langue d'origine) ; seule la forme est contrôlée ici.
 */
export class ContentLocaleQueryDto {
  @ApiProperty({ required: false, example: "en" })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  locale?: string;
}
