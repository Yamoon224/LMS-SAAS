import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ActivateAccountDto {
  @ApiProperty({ description: "Token reçu dans le lien d'activation" })
  @IsString()
  token!: string;

  @ApiProperty({ example: "S3cret-password!" })
  @IsString()
  @MinLength(8)
  password!: string;
}
