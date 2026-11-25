import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

/** ADM-26: traitement des demandes de remboursement. */
export class RefundPaymentDto {
  @ApiProperty({ example: 50000, description: "Montant à rembourser, plus petite unité de la devise" })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ required: false, example: "Formation retirée avant le début de la session" })
  @IsOptional()
  @IsString()
  reason?: string;
}
