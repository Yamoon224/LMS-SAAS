import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsString, Length, Min } from "class-validator";

export enum PaymentProviderCodeDto {
  PAYSTACK = "PAYSTACK",
  PIXEL_INNOV = "PIXEL_INNOV",
  OTHER = "OTHER",
}

export enum PaymentMethodDto {
  CARD = "CARD",
  ORANGE_MONEY = "ORANGE_MONEY",
  MTN_MOMO = "MTN_MOMO",
  MOOV_MONEY = "MOOV_MONEY",
  WAVE = "WAVE",
  OTHER = "OTHER",
}

/** ADM-20: activer/désactiver chaque fournisseur, clés test/production, moyens proposés, priorité. */
export class SetProviderConfigDto {
  @ApiProperty({ enum: PaymentProviderCodeDto })
  @IsEnum(PaymentProviderCodeDto)
  code!: PaymentProviderCodeDto;

  @ApiProperty({ example: "Paystack" })
  @IsString()
  @Length(2, 100)
  label!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  isTestMode!: boolean;

  @ApiProperty({ example: 0, description: "Priorité croissante: 0 = prioritaire" })
  @IsInt()
  @Min(0)
  priority!: number;

  @ApiProperty({ enum: PaymentMethodDto, isArray: true })
  @IsArray()
  @IsEnum(PaymentMethodDto, { each: true })
  supportedMethods!: PaymentMethodDto[];

  @ApiProperty({ example: { secretKey: "sk_live_..." }, description: "Jamais renvoyées en clair" })
  @IsObject()
  credentials!: Record<string, string>;
}
