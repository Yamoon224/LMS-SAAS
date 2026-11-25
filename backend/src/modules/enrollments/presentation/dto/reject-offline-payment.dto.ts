import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/** ENT-61 : motif obligatoire du refus d'un paiement hors plateforme (communiqué à l'apprenant). */
export class RejectOfflinePaymentDto {
  @ApiProperty({ example: "Virement non reçu après 10 jours." })
  @IsString()
  @Length(1, 500)
  reason!: string;
}
