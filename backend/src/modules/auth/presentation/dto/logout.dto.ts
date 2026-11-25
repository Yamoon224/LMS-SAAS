import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LogoutDto {
  @ApiProperty({ description: "Jeton de rafraîchissement brut à révoquer (cookie httpOnly côté client)" })
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}
