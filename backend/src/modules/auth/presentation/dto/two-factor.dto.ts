import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

/** 6 chiffres (TOTP) ou code de récupération `XXXXX-XXXXX` : la forme exacte est revalidée par le domaine. */
const CODE_PATTERN = /^[A-Za-z0-9 -]{6,16}$/;

export class ChallengeDto {
  @ApiProperty({ description: "Jeton de défi reçu à la connexion (5 min, usage unique)" })
  @IsString()
  @Length(64, 64)
  @Matches(/^[0-9a-f]{64}$/)
  challengeToken!: string;
}

export class VerifyTwoFactorDto extends ChallengeDto {
  @ApiProperty({ example: "123456", description: "Code TOTP à 6 chiffres ou code de récupération" })
  @IsString()
  @Matches(CODE_PATTERN)
  code!: string;
}

export class ConfirmTwoFactorDto {
  @ApiProperty({ example: "123456", description: "Premier code TOTP affiché par l'application d'authentification" })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class EnrollTwoFactorDto extends ChallengeDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class PasswordAndCodeDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;

  @ApiProperty({ example: "123456", description: "Code TOTP ou code de récupération" })
  @IsString()
  @Matches(CODE_PATTERN)
  code!: string;
}
