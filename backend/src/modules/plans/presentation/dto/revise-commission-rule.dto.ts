import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

/** ADM-15/ADM-16 : nouveaux taux d'une règle (portée, type et cible ne changent pas) ; `null` ou absent = pas de ce taux. */
export class ReviseCommissionRuleDto {
  @ApiPropertyOptional({ nullable: true, example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentRate?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number | null;
}
