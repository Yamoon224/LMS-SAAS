import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString, IsUrl } from "class-validator";

const PAYMENT_METHODS = ["CARD", "ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE", "OTHER"] as const;

export class PurchaseCreditPackDto {
  @ApiProperty()
  @IsString()
  creditPackId!: string;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}
