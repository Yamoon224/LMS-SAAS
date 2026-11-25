import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Validation de forme ici ; les règles fines (https, #RRGGBB, IBAN, assainissement) sont dans le domaine. */
export class UpdateBrandingDto {
  @ApiProperty({ example: "Acme Formation" })
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  displayName!: string;

  @ApiPropertyOptional({ example: "https://cdn.acme.com/logo.png", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: "#1D4ED8", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string | null;

  @ApiPropertyOptional({ example: "#0F172A", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryColor?: string | null;
}

export class UpdateContactsDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  contactEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contactPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  legalName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  registrationNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  taxId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string | null;
}

export class UpdateOfflinePaymentDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ description: "Texte brut, 2000 caractères maximum ; le HTML est retiré.", nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  instructions?: string | null;
}

export class UpdatePayoutAccountDto {
  @ApiProperty({ enum: ["MOBILE_MONEY", "BANK"] })
  @IsIn(["MOBILE_MONEY", "BANK"])
  type!: "MOBILE_MONEY" | "BANK";

  @ApiPropertyOptional({ enum: ["ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE"], description: "Obligatoire pour MOBILE_MONEY." })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  operator?: string;

  @ApiProperty({ description: "Numéro Mobile Money, ou IBAN / RIB." })
  @IsString()
  @MaxLength(60)
  accountNumber!: string;

  @ApiProperty({ description: "Titulaire du compte." })
  @IsString()
  @MaxLength(500)
  accountName!: string;

  @ApiProperty({ description: "Mot de passe actuel de l'utilisateur connecté (ré-authentification)." })
  @IsString()
  @MaxLength(200)
  currentPassword!: string;
}
