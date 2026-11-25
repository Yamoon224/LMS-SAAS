import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsString, Length, MaxLength, Min } from "class-validator";

import { LEGAL_DOCUMENT_TYPES } from "../../domain/legal-document";

export class CreateLegalDraftDto {
  @ApiProperty({ enum: LEGAL_DOCUMENT_TYPES })
  @IsIn(LEGAL_DOCUMENT_TYPES)
  type!: string;

  @ApiProperty({ example: "Conditions générales d'utilisation" })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ description: "Texte brut ; les paragraphes sont séparés par une ligne vide." })
  @IsString()
  @MaxLength(200_000)
  content!: string;
}

export class UpdateLegalDraftDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200_000)
  content!: string;
}

export class AcceptLegalDocumentDto {
  @ApiProperty({ description: "Version du document affichée à l'utilisateur et acceptée par lui." })
  @IsInt()
  @Min(1)
  version!: number;
}
