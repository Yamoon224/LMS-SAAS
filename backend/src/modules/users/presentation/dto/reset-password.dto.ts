import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "Token reçu dans le lien de réinitialisation" })
  @IsString()
  @MaxLength(256)
  token!: string;

  @ApiProperty({ example: "N0uveau-mot-de-passe!" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
