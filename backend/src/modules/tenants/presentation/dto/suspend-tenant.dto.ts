import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/** ADM-08: motif obligatoire pour toute suspension. */
export class SuspendTenantDto {
  @ApiProperty({ example: "Non-respect des CGU" })
  @IsString()
  @Length(3, 500)
  reason!: string;
}
