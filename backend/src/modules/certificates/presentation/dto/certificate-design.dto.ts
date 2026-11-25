import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import {
  BORDER_STYLES,
  CERTIFICATE_LANGUAGES,
  DESIGN_LIMITS,
  FONT_FAMILIES,
  LOGO_POSITIONS,
  LOGO_SIZES,
  ORIENTATIONS,
  PAGE_FORMATS,
  WATERMARK_TYPES,
} from "../../domain/certificate-design";

const HEX = /^#[0-9a-fA-F]{6}$/;
/** Texte libre : pas de chevrons ni de caractère de contrôle (aucun balisage). */
// eslint-disable-next-line no-control-regex
const PLAIN_TEXT = /^[^<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/;
const PLAIN_TEXT_MESSAGE = "ne doit contenir ni « < », ni « > », ni caractère de contrôle";
const URL_OPTIONS = { protocols: ["http", "https"], require_protocol: true, require_tld: false, allow_underscores: true };

function hex(field: string) {
  return Matches(HEX, { message: `${field} doit être une couleur au format #RRGGBB` });
}

/** Signataire du certificat (1 à 2). */
export class CertificateSignatoryDto {
  @ApiPropertyOptional({ example: "Awa Koné" })
  @IsString()
  @MinLength(1)
  @MaxLength(DESIGN_LIMITS.signatoryName)
  @Matches(PLAIN_TEXT, { message: `name ${PLAIN_TEXT_MESSAGE}` })
  name!: string;

  @ApiPropertyOptional({ example: "Directrice pédagogique" })
  @IsOptional()
  @IsString()
  @MaxLength(DESIGN_LIMITS.signatoryTitle)
  @Matches(PLAIN_TEXT, { message: `title ${PLAIN_TEXT_MESSAGE}` })
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(DESIGN_LIMITS.url)
  imageUrl?: string;
}

/** Apparence d'un modèle : tout est optionnel (valeurs par défaut au rendu), valeurs bornées et listes blanches. */
export class CertificateDesignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(DESIGN_LIMITS.url)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(DESIGN_LIMITS.url)
  badgeUrl?: string;

  @ApiPropertyOptional({ description: "Ancien format : utiliser `signatories`." })
  @IsOptional()
  @IsString()
  @MaxLength(DESIGN_LIMITS.signatoryName)
  @Matches(PLAIN_TEXT, { message: `signatureName ${PLAIN_TEXT_MESSAGE}` })
  signatureName?: string;

  @ApiPropertyOptional({ description: "Ancien format : utiliser `signatories`." })
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(DESIGN_LIMITS.url)
  signatureImageUrl?: string;

  @ApiPropertyOptional({ example: "#1e3a8a" })
  @IsOptional()
  @hex("primaryColor")
  primaryColor?: string;

  @ApiPropertyOptional({ example: "#111827" })
  @IsOptional()
  @hex("textColor")
  textColor?: string;

  @ApiPropertyOptional({ example: "#6b7280" })
  @IsOptional()
  @hex("secondaryColor")
  secondaryColor?: string;

  @ApiPropertyOptional({ enum: FONT_FAMILIES })
  @IsOptional()
  @IsIn(FONT_FAMILIES)
  fontFamily?: (typeof FONT_FAMILIES)[number];

  @ApiPropertyOptional({ enum: ORIENTATIONS })
  @IsOptional()
  @IsIn(ORIENTATIONS)
  orientation?: (typeof ORIENTATIONS)[number];

  @ApiPropertyOptional({ enum: BORDER_STYLES })
  @IsOptional()
  @IsIn(BORDER_STYLES)
  borderStyle?: (typeof BORDER_STYLES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(DESIGN_LIMITS.url)
  backgroundUrl?: string;

  @ApiPropertyOptional({ enum: PAGE_FORMATS })
  @IsOptional()
  @IsIn(PAGE_FORMATS)
  pageFormat?: (typeof PAGE_FORMATS)[number];

  @ApiPropertyOptional({ example: "#1e3a8a" })
  @IsOptional()
  @hex("borderColor")
  borderColor?: string;

  @ApiPropertyOptional({ example: "#ffffff" })
  @IsOptional()
  @hex("backgroundColor")
  backgroundColor?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(DESIGN_LIMITS.opacityMin)
  @Max(DESIGN_LIMITS.opacityMax)
  backgroundOpacity?: number;

  @ApiPropertyOptional({ enum: LOGO_POSITIONS })
  @IsOptional()
  @IsIn(LOGO_POSITIONS)
  logoPosition?: (typeof LOGO_POSITIONS)[number];

  @ApiPropertyOptional({ enum: LOGO_SIZES })
  @IsOptional()
  @IsIn(LOGO_SIZES)
  logoSize?: (typeof LOGO_SIZES)[number];

  @ApiPropertyOptional({ enum: WATERMARK_TYPES })
  @IsOptional()
  @IsIn(WATERMARK_TYPES)
  watermarkType?: (typeof WATERMARK_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(DESIGN_LIMITS.watermarkText)
  @Matches(PLAIN_TEXT, { message: `watermarkText ${PLAIN_TEXT_MESSAGE}` })
  watermarkText?: string;

  @ApiPropertyOptional({ minimum: DESIGN_LIMITS.watermarkOpacityMin, maximum: DESIGN_LIMITS.watermarkOpacityMax })
  @IsOptional()
  @IsNumber()
  @Min(DESIGN_LIMITS.watermarkOpacityMin)
  @Max(DESIGN_LIMITS.watermarkOpacityMax)
  watermarkOpacity?: number;

  @ApiPropertyOptional({ example: "Certificat de réussite" })
  @IsOptional()
  @IsString()
  @MaxLength(DESIGN_LIMITS.title)
  @Matches(PLAIN_TEXT, { message: `title ${PLAIN_TEXT_MESSAGE}` })
  title?: string;

  @ApiPropertyOptional({ example: "{{learnerName}} a complété la formation {{courseTitle}} le {{date}}." })
  @IsOptional()
  @IsString()
  @MaxLength(DESIGN_LIMITS.bodyText)
  @Matches(PLAIN_TEXT, { message: `bodyText ${PLAIN_TEXT_MESSAGE}` })
  bodyText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(DESIGN_LIMITS.footerText)
  @Matches(PLAIN_TEXT, { message: `footerText ${PLAIN_TEXT_MESSAGE}` })
  footerText?: string;

  @ApiPropertyOptional({ enum: CERTIFICATE_LANGUAGES })
  @IsOptional()
  @IsIn(CERTIFICATE_LANGUAGES)
  language?: (typeof CERTIFICATE_LANGUAGES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showScore?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showNumber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showDuration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showQrCode?: boolean;

  @ApiPropertyOptional({ type: [CertificateSignatoryDto], description: "1 à 2 signataires." })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DESIGN_LIMITS.maxSignatories)
  @ValidateNested({ each: true })
  @Type(() => CertificateSignatoryDto)
  signatories?: CertificateSignatoryDto[];
}
