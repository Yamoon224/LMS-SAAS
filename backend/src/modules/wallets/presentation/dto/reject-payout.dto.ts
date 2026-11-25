import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class RejectPayoutDto {
  @ApiProperty({ example: "Coordonnées bancaires non vérifiées" })
  @IsString()
  @Length(3, 500)
  reason!: string;
}
