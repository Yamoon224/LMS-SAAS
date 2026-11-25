import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class ExtendSubscriptionDto {
  @ApiProperty({ required: false, description: "Jours ajoutés à l'échéance courante (1 à 366)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(366)
  days?: number;

  @ApiProperty({ required: false, description: "Nouvelle échéance (ISO 8601), postérieure à l'actuelle" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  until?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class ApplyDiscountDto {
  @ApiProperty({ required: false, description: "Remise en pourcentage (1 à 100)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percent?: number;

  @ApiProperty({ required: false, description: "Remise en montant fixe par période (plus petite unité)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({ description: "Nombre de périodes facturées remisées (1 à 36)" })
  @IsInt()
  @Min(1)
  @Max(36)
  periods!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class OfferPlanDto {
  @ApiProperty()
  @IsString()
  planPriceId!: string;

  @ApiProperty({ description: "Durée du plan offert, en jours (1 à 3650)" })
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;

  @ApiProperty({ description: "Motif obligatoire (journalisé)" })
  @IsString()
  @Length(5, 300)
  reason!: string;
}
