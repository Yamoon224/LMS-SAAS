import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SubscribeToPlanDto {
  @ApiProperty({ description: "Identifiant de la PlanPrice choisie (plan + périodicité)" })
  @IsString()
  planPriceId!: string;

  @ApiProperty({ default: false, description: "PROP-26: démarrer en période d'essai sans paiement" })
  @IsOptional()
  @IsBoolean()
  startWithTrial?: boolean;
}
