import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length, Matches, ValidateIf } from "class-validator";

/** ADM-10 : tous les champs sont optionnels (mise à jour partielle) ; le slug n'est pas modifiable. */
export class UpdateTenantDto {
  @ApiPropertyOptional({ example: "Acme Formation" })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @ApiPropertyOptional({ example: "CI" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: "XOF" })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: "fr" })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  defaultLocale?: string;

  @ApiPropertyOptional({ example: "contact@acme.com", description: "Chaîne vide pour effacer" })
  @IsOptional()
  @ValidateIf((_object, value) => value !== "")
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: "+2250700000000", description: "Chaîne vide pour effacer" })
  @IsOptional()
  @ValidateIf((_object, value) => value !== "")
  @Matches(/^\+?[0-9 ().-]{6,20}$/, { message: "Numéro de téléphone invalide." })
  contactPhone?: string;
}
