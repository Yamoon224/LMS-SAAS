import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

import { BODY_MAX_LENGTH, SUBJECT_MAX_LENGTH } from "../../domain/template-overrides";

export class SaveNotificationTemplateDto {
  @ApiProperty({ example: "Réinitialisation de votre mot de passe" })
  @IsString()
  @MaxLength(SUBJECT_MAX_LENGTH)
  subject!: string;

  @ApiProperty({ example: "Bonjour {{firstName}}, voici votre lien : {{resetUrl}}" })
  @IsString()
  @MaxLength(BODY_MAX_LENGTH)
  body!: string;
}
