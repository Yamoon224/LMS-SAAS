import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

export class DateRangeDto {
  @ApiPropertyOptional({ description: "Défaut: début du mois courant" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Défaut: maintenant" })
  @IsOptional()
  @IsDateString()
  to?: string;
}
