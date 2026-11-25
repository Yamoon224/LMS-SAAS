import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsString, Length, Matches, Max, Min } from "class-validator";

export class RequestUploadDto {
  @ApiProperty({ example: "introduction.mp4" })
  @IsString()
  @Length(1, 255)
  // Pas de séparateur de chemin ni de caractère de contrôle dans un nom de fichier.
  // eslint-disable-next-line no-control-regex
  @Matches(/^[^\\/\u0000-\u001F]+$/, { message: "Nom de fichier invalide." })
  filename!: string;

  @ApiProperty({ example: "video/mp4" })
  @IsString()
  @Length(3, 127)
  mimeType!: string;

  @ApiProperty({ example: 52428800, description: "Taille en octets" })
  @IsInt()
  @Min(1)
  // Plafond technique (colonne entière) ; les plafonds par nature de média sont appliqués par le domaine.
  @Max(2_147_483_647)
  sizeBytes!: number;

  @ApiProperty({ default: false, description: "ENT-24: téléchargement autorisé" })
  @IsBoolean()
  downloadAllowed!: boolean;
}
