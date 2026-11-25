import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({ description: "Jeton de rafraîchissement brut (cookie httpOnly côté client)" })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
