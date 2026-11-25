import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, Min } from "class-validator";

/** ENT-61/RG-07: référence et montant reçu obligatoires. */
export class ValidateOfflinePaymentDto {
  @ApiProperty({ example: "VIR-2026-00123" })
  @IsString()
  @Length(1, 200)
  reference!: string;

  @ApiProperty({ example: 25000 })
  @IsInt()
  @Min(1)
  declaredAmount!: number;
}
