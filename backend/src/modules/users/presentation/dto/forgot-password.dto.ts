import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({ example: "awa@example.com" })
  @IsString()
  @MaxLength(254)
  email!: string;
}
