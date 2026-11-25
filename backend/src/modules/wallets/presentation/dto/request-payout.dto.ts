import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export enum PayoutDestinationTypeDto {
  BANK = "BANK",
  MOBILE_MONEY = "MOBILE_MONEY",
}

/**
 * ENT-69/ENT-11: demande de reversement vers les coordonnées VÉRIFIÉES enregistrées de l'entreprise.
 * Les champs ci-dessous sont obsolètes et ignorés (conservés optionnels pour la compatibilité des clients).
 */
export class RequestPayoutDto {
  @ApiPropertyOptional({ enum: PayoutDestinationTypeDto, deprecated: true })
  @IsOptional()
  @IsEnum(PayoutDestinationTypeDto)
  type?: PayoutDestinationTypeDto;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @Length(4, 40)
  accountNumber?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  accountName?: string;
}
