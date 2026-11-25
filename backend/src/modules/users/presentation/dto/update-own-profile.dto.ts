import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

/** Langues d'interface prévues par le cahier des charges (D5) : français par défaut. */
export const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "ar", "zh", "ru", "tr"] as const;

/**
 * Seuls ces champs sont modifiables par l'utilisateur lui-même : jamais l'e-mail (identifiant de connexion),
 * le statut, le type de compte ni les rôles.
 */
export class UpdateOwnProfileDto {
  @ApiProperty({ required: false, example: "Aya" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiProperty({ required: false, example: "Koné" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiProperty({ required: false, example: "+2250700000000" })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 ().-]{6,20}$/, { message: "Numéro de téléphone invalide." })
  phone?: string;

  @ApiProperty({ required: false, enum: SUPPORTED_LOCALES })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
