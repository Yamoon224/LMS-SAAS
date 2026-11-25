import { DomainError } from "@shared/errors";

/**
 * Section 12.4 / ADM-39 : apparence d'un modèle de certificat. Fonctions pures (section 13.1).
 *
 * Réglages appliqués par le rendu PDF : page, police, couleurs, bordure, fond, logo, filigrane, textes, signataires…
 * Les polices sont celles intégrées à tout lecteur PDF (aucune police à embarquer).
 */
export const FONT_FAMILIES = ["HELVETICA", "TIMES", "COURIER"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

export const ORIENTATIONS = ["LANDSCAPE", "PORTRAIT"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export const BORDER_STYLES = ["NONE", "SIMPLE", "DOUBLE", "ORNATE"] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number];

export const PAGE_FORMATS = ["A4", "LETTER"] as const;
export type PageFormat = (typeof PAGE_FORMATS)[number];

export const LOGO_POSITIONS = ["LEFT", "CENTER", "RIGHT"] as const;
export type LogoPosition = (typeof LOGO_POSITIONS)[number];

export const LOGO_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export type LogoSize = (typeof LOGO_SIZES)[number];

export const WATERMARK_TYPES = ["NONE", "TEXT", "LOGO"] as const;
export type WatermarkType = (typeof WATERMARK_TYPES)[number];

/**
 * Langues des textes par défaut du certificat. AR (arabe, écrit de droite à gauche), ZH (chinois simplifié), RU et TR
 * utilisent des polices Noto embarquées (shared/pdf/fonts) : les polices standard ne couvrent pas ces alphabets.
 */
export const CERTIFICATE_LANGUAGES = ["FR", "EN", "AR", "ZH", "RU", "TR"] as const;
export type CertificateLanguage = (typeof CERTIFICATE_LANGUAGES)[number];

/** Variables autorisées dans les textes personnalisés. */
export const TEXT_VARIABLES = ["learnerName", "courseTitle", "date", "score", "certificateNumber"] as const;
export type TextVariable = (typeof TEXT_VARIABLES)[number];

/** Bornes des champs libres. */
export const DESIGN_LIMITS = {
  url: 500,
  title: 80,
  bodyText: 400,
  footerText: 200,
  watermarkText: 40,
  signatoryName: 80,
  signatoryTitle: 80,
  maxSignatories: 2,
  opacityMin: 0,
  opacityMax: 1,
  watermarkOpacityMin: 0.02,
  watermarkOpacityMax: 0.3,
} as const;

/** Noms des polices PDF standard (normale, gras) pour chaque famille. */
export const PDF_FONTS: Record<FontFamily, { regular: string; bold: string }> = {
  HELVETICA: { regular: "Helvetica", bold: "Helvetica-Bold" },
  TIMES: { regular: "Times-Roman", bold: "Times-Bold" },
  COURIER: { regular: "Courier", bold: "Courier-Bold" },
};

/** Textes par défaut du certificat selon sa langue. */
export const CERTIFICATE_TEXTS: Record<
  CertificateLanguage,
  {
    title: string;
    awardedTo: string;
    completed: string;
    score: string;
    issuedOn: string;
    number: string;
    duration: string;
    verify: string;
    locale: string;
  }
> = {
  FR: {
    title: "Certificat de réussite",
    awardedTo: "décerné à",
    completed: "pour avoir complété la formation",
    score: "Score obtenu",
    issuedOn: "Délivré le",
    number: "N°",
    duration: "Durée de la formation",
    verify: "Vérifier",
    locale: "fr-FR",
  },
  EN: {
    title: "Certificate of Achievement",
    awardedTo: "awarded to",
    completed: "for successfully completing the course",
    score: "Score",
    issuedOn: "Issued on",
    number: "No.",
    duration: "Course duration",
    verify: "Verify",
    locale: "en-GB",
  },
  AR: {
    title: "شهادة نجاح",
    awardedTo: "تُمنح إلى",
    completed: "لإتمامه الدورة التدريبية",
    score: "النتيجة",
    issuedOn: "صدرت بتاريخ",
    number: "رقم",
    duration: "مدة الدورة",
    verify: "تحقق",
    locale: "ar-u-nu-latn",
  },
  ZH: {
    title: "结业证书",
    awardedTo: "兹授予",
    completed: "已顺利完成课程",
    score: "成绩",
    issuedOn: "颁发日期",
    number: "编号",
    duration: "课程时长",
    verify: "验证",
    locale: "zh-CN",
  },
  RU: {
    title: "Сертификат об окончании курса",
    awardedTo: "выдан",
    completed: "за успешное прохождение курса",
    score: "Результат",
    issuedOn: "Дата выдачи",
    number: "№",
    duration: "Длительность курса",
    verify: "Проверить",
    locale: "ru-RU",
  },
  TR: {
    title: "Başarı Sertifikası",
    awardedTo: "adına düzenlenmiştir:",
    completed: "eğitimi başarıyla tamamladığı için",
    score: "Puan",
    issuedOn: "Düzenlenme tarihi",
    number: "No",
    duration: "Eğitim süresi",
    verify: "Doğrula",
    locale: "tr-TR",
  },
};

export interface CertificateSignatory {
  name: string;
  /** Fonction (ex. « Directrice pédagogique »). */
  title?: string;
  imageUrl?: string;
}

/** Section 12.4: mise en page, logo, insigne, signatures, couleurs — propre à chaque tenant ou à la bibliothèque. Tout est optionnel. */
export interface CertificateDesign {
  logoUrl?: string;
  badgeUrl?: string;
  /** Ancien format (un seul signataire) : utilisé seulement si `signatories` est vide. */
  signatureName?: string;
  signatureImageUrl?: string;
  /** Couleur d'accent (bandeau, nom de l'apprenant) : `#RRGGBB`. */
  primaryColor?: string;
  backgroundUrl?: string;
  /** Couleur du texte principal : `#RRGGBB`. */
  textColor?: string;
  /** Couleur du texte secondaire (date, numéro, mention de vérification) : `#RRGGBB`. */
  secondaryColor?: string;
  fontFamily?: FontFamily;
  orientation?: Orientation;
  borderStyle?: BorderStyle;
  pageFormat?: PageFormat;
  /** Couleur de la bordure (défaut : couleur principale). */
  borderColor?: string;
  backgroundColor?: string;
  /** Opacité de l'image de fond, de 0 à 1 (défaut 1). */
  backgroundOpacity?: number;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  watermarkType?: WatermarkType;
  watermarkText?: string;
  watermarkOpacity?: number;
  /** Titre (défaut selon la langue). */
  title?: string;
  /** Texte d'attestation avec variables `{{learnerName}}`, `{{courseTitle}}`, `{{date}}`, `{{score}}`, `{{certificateNumber}}`. */
  bodyText?: string;
  footerText?: string;
  language?: CertificateLanguage;
  showScore?: boolean;
  showDate?: boolean;
  showNumber?: boolean;
  showDuration?: boolean;
  showQrCode?: boolean;
  signatories?: CertificateSignatory[];
}

export const DEFAULT_DESIGN = {
  primaryColor: "#1e3a8a",
  textColor: "#111827",
  secondaryColor: "#6b7280",
  fontFamily: "HELVETICA",
  orientation: "LANDSCAPE",
  borderStyle: "NONE",
  pageFormat: "A4",
  borderColor: "#1e3a8a",
  backgroundColor: "#ffffff",
  backgroundOpacity: 1,
  logoPosition: "CENTER",
  logoSize: "MEDIUM",
  watermarkType: "NONE",
  watermarkOpacity: 0.08,
  language: "FR",
  showScore: true,
  showDate: true,
  showNumber: true,
  showDuration: false,
  showQrCode: true,
  signatories: [],
} as const;

/** Design dont tous les réglages de rendu sont renseignés (valeurs par défaut appliquées, valeurs sûres uniquement). */
export interface ResolvedDesign {
  primaryColor: string;
  textColor: string;
  secondaryColor: string;
  fontFamily: FontFamily;
  orientation: Orientation;
  borderStyle: BorderStyle;
  pageFormat: PageFormat;
  borderColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
  watermarkType: WatermarkType;
  watermarkOpacity: number;
  language: CertificateLanguage;
  showScore: boolean;
  showDate: boolean;
  showNumber: boolean;
  showDuration: boolean;
  showQrCode: boolean;
  logoUrl?: string;
  badgeUrl?: string;
  backgroundUrl?: string;
  watermarkText?: string;
  title?: string;
  bodyText?: string;
  footerText?: string;
  signatories: CertificateSignatory[];
}

export class InvalidCertificateDesignError extends DomainError {
  readonly code = "DESIGN_CERTIFICAT_INVALIDE";
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
/** Caractères de contrôle (hors tabulation et saut de ligne) : refusés dans les textes libres. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_CHARS_GLOBAL = new RegExp(CONTROL_CHARS.source, "g");
const VARIABLE_PATTERN = /\{\{\s*([A-Za-z]+)\s*\}\}/g;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

/** URL http(s) sans identifiants intégrés, de longueur bornée. */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > DESIGN_LIMITS.url) return false;
  if (/[\s<>"'`\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

/** Texte libre borné, sans caractère de contrôle ni chevrons (aucun balisage). */
export function isSafeText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max && !CONTROL_CHARS.test(value) && !/[<>]/.test(value);
}

/** Variables `{{x}}` utilisées dans un texte mais inconnues. */
export function unknownVariables(text: string): string[] {
  return [...text.matchAll(VARIABLE_PATTERN)]
    .map((match) => match[1] as string)
    .filter((name) => !(TEXT_VARIABLES as readonly string[]).includes(name));
}

/** Remplace les variables connues ; une variable inconnue est laissée telle quelle. Texte brut : jamais interprété. */
export function renderTemplateText(text: string, values: Record<TextVariable, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, name: string) =>
    (TEXT_VARIABLES as readonly string[]).includes(name) ? values[name as TextVariable] : match,
  );
}

/** Retire caractères de contrôle et chevrons d'un texte avant de le transmettre au moteur PDF. */
function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(CONTROL_CHARS_GLOBAL, "").replace(/[<>]/g, "").trim().slice(0, max);
  return cleaned === "" ? undefined : cleaned;
}

/**
 * Valeur de rendu sûre pour une couleur : une couleur invalide (ancienne donnée libre, valeur corrompue) retombe
 * sur la valeur par défaut au lieu d'être transmise telle quelle au moteur PDF.
 */
function safeColor(value: unknown, fallback: string): string {
  return isHexColor(value) ? value : fallback;
}

function safeUrl(value: unknown): string | undefined {
  return isSafeHttpUrl(value) ? value : undefined;
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function resolveSignatories(design: CertificateDesign | null | undefined): CertificateSignatory[] {
  const list = Array.isArray(design?.signatories) ? design.signatories : [];
  const resolved: CertificateSignatory[] = [];
  for (const item of list.slice(0, DESIGN_LIMITS.maxSignatories)) {
    const name = cleanText(item?.name, DESIGN_LIMITS.signatoryName);
    if (!name) continue;
    resolved.push({ name, title: cleanText(item.title, DESIGN_LIMITS.signatoryTitle), imageUrl: safeUrl(item.imageUrl) });
  }
  if (resolved.length === 0) {
    const legacyName = cleanText(design?.signatureName, DESIGN_LIMITS.signatoryName);
    if (legacyName) resolved.push({ name: legacyName, imageUrl: safeUrl(design?.signatureImageUrl) });
  }
  return resolved;
}

/** Complète et assainit un design pour le rendu : jamais de valeur libre transmise au moteur PDF. */
export function resolveDesign(design: CertificateDesign | null | undefined): ResolvedDesign {
  const primaryColor = safeColor(design?.primaryColor, DEFAULT_DESIGN.primaryColor);
  return {
    primaryColor,
    textColor: safeColor(design?.textColor, DEFAULT_DESIGN.textColor),
    secondaryColor: safeColor(design?.secondaryColor, DEFAULT_DESIGN.secondaryColor),
    fontFamily: oneOf(FONT_FAMILIES, design?.fontFamily, DEFAULT_DESIGN.fontFamily),
    orientation: oneOf(ORIENTATIONS, design?.orientation, DEFAULT_DESIGN.orientation),
    borderStyle: oneOf(BORDER_STYLES, design?.borderStyle, DEFAULT_DESIGN.borderStyle),
    pageFormat: oneOf(PAGE_FORMATS, design?.pageFormat, DEFAULT_DESIGN.pageFormat),
    borderColor: safeColor(design?.borderColor, primaryColor),
    backgroundColor: safeColor(design?.backgroundColor, DEFAULT_DESIGN.backgroundColor),
    backgroundOpacity: clampNumber(
      design?.backgroundOpacity,
      DESIGN_LIMITS.opacityMin,
      DESIGN_LIMITS.opacityMax,
      DEFAULT_DESIGN.backgroundOpacity,
    ),
    logoPosition: oneOf(LOGO_POSITIONS, design?.logoPosition, DEFAULT_DESIGN.logoPosition),
    logoSize: oneOf(LOGO_SIZES, design?.logoSize, DEFAULT_DESIGN.logoSize),
    watermarkType: oneOf(WATERMARK_TYPES, design?.watermarkType, DEFAULT_DESIGN.watermarkType),
    watermarkOpacity: clampNumber(
      design?.watermarkOpacity,
      DESIGN_LIMITS.watermarkOpacityMin,
      DESIGN_LIMITS.watermarkOpacityMax,
      DEFAULT_DESIGN.watermarkOpacity,
    ),
    language: oneOf(CERTIFICATE_LANGUAGES, design?.language, DEFAULT_DESIGN.language),
    showScore: bool(design?.showScore, DEFAULT_DESIGN.showScore),
    showDate: bool(design?.showDate, DEFAULT_DESIGN.showDate),
    showNumber: bool(design?.showNumber, DEFAULT_DESIGN.showNumber),
    showDuration: bool(design?.showDuration, DEFAULT_DESIGN.showDuration),
    showQrCode: bool(design?.showQrCode, DEFAULT_DESIGN.showQrCode),
    logoUrl: safeUrl(design?.logoUrl),
    badgeUrl: safeUrl(design?.badgeUrl),
    backgroundUrl: safeUrl(design?.backgroundUrl),
    watermarkText: cleanText(design?.watermarkText, DESIGN_LIMITS.watermarkText),
    title: cleanText(design?.title, DESIGN_LIMITS.title),
    bodyText: cleanText(design?.bodyText, DESIGN_LIMITS.bodyText),
    footerText: cleanText(design?.footerText, DESIGN_LIMITS.footerText),
    signatories: resolveSignatories(design),
  };
}

/**
 * Valide un design à l'enregistrement : couleurs `#RRGGBB`, URLs http(s), choix parmi les listes blanches, textes
 * bornés sans balisage, variables connues, 2 signataires maximum. Les champs absents sont acceptés (valeurs par
 * défaut). Renvoie la liste des problèmes plutôt que de s'arrêter au premier, pour les afficher tous.
 */
export function validateDesign(design: CertificateDesign): string[] {
  const problems: string[] = [];
  for (const field of ["primaryColor", "textColor", "secondaryColor", "borderColor", "backgroundColor"] as const) {
    const value = design[field];
    if (value !== undefined && !isHexColor(value)) {
      problems.push(`${field} doit être une couleur au format #RRGGBB.`);
    }
  }
  const choices: [keyof CertificateDesign, readonly string[]][] = [
    ["fontFamily", FONT_FAMILIES],
    ["orientation", ORIENTATIONS],
    ["borderStyle", BORDER_STYLES],
    ["pageFormat", PAGE_FORMATS],
    ["logoPosition", LOGO_POSITIONS],
    ["logoSize", LOGO_SIZES],
    ["watermarkType", WATERMARK_TYPES],
    ["language", CERTIFICATE_LANGUAGES],
  ];
  for (const [field, allowed] of choices) {
    const value = design[field];
    if (value !== undefined && !allowed.includes(value as string)) {
      problems.push(`${field} doit être l'une des valeurs : ${allowed.join(", ")}.`);
    }
  }
  for (const field of ["logoUrl", "badgeUrl", "backgroundUrl", "signatureImageUrl"] as const) {
    const value = design[field];
    if (value !== undefined && !isSafeHttpUrl(value)) problems.push(`${field} doit être une URL http(s) valide.`);
  }
  const texts: [keyof CertificateDesign, number][] = [
    ["title", DESIGN_LIMITS.title],
    ["bodyText", DESIGN_LIMITS.bodyText],
    ["footerText", DESIGN_LIMITS.footerText],
    ["watermarkText", DESIGN_LIMITS.watermarkText],
    ["signatureName", DESIGN_LIMITS.signatoryName],
  ];
  for (const [field, max] of texts) {
    const value = design[field];
    if (value !== undefined && !isSafeText(value, max)) {
      problems.push(`${field} : ${max} caractères maximum, sans « < » ni « > » ni caractère de contrôle.`);
    }
  }
  for (const field of ["title", "bodyText", "footerText"] as const) {
    const value = design[field];
    if (typeof value === "string") {
      const unknown = unknownVariables(value);
      if (unknown.length > 0) problems.push(`${field} : variable(s) inconnue(s) ${unknown.map((name) => `{{${name}}}`).join(", ")}.`);
    }
  }
  const opacities: [keyof CertificateDesign, number, number][] = [
    ["backgroundOpacity", DESIGN_LIMITS.opacityMin, DESIGN_LIMITS.opacityMax],
    ["watermarkOpacity", DESIGN_LIMITS.watermarkOpacityMin, DESIGN_LIMITS.watermarkOpacityMax],
  ];
  for (const [field, min, max] of opacities) {
    const value = design[field];
    if (value !== undefined && !(typeof value === "number" && Number.isFinite(value) && value >= min && value <= max)) {
      problems.push(`${field} doit être un nombre entre ${min} et ${max}.`);
    }
  }
  for (const field of ["showScore", "showDate", "showNumber", "showDuration", "showQrCode"] as const) {
    if (design[field] !== undefined && typeof design[field] !== "boolean") problems.push(`${field} doit être un booléen.`);
  }
  if (design.signatories !== undefined) {
    if (!Array.isArray(design.signatories) || design.signatories.length > DESIGN_LIMITS.maxSignatories) {
      problems.push(`signatories : ${DESIGN_LIMITS.maxSignatories} signataires maximum.`);
    } else {
      design.signatories.forEach((signatory, index) => {
        const label = `signatories[${index}]`;
        if (!isSafeText(signatory?.name, DESIGN_LIMITS.signatoryName) || signatory.name.trim() === "") {
          problems.push(`${label}.name est obligatoire (${DESIGN_LIMITS.signatoryName} caractères maximum, sans balisage).`);
        }
        if (signatory?.title !== undefined && !isSafeText(signatory.title, DESIGN_LIMITS.signatoryTitle)) {
          problems.push(`${label}.title : ${DESIGN_LIMITS.signatoryTitle} caractères maximum, sans balisage.`);
        }
        if (signatory?.imageUrl !== undefined && !isSafeHttpUrl(signatory.imageUrl)) {
          problems.push(`${label}.imageUrl doit être une URL http(s) valide.`);
        }
      });
    }
  }
  return problems;
}

export function assertValidDesign(design: CertificateDesign): void {
  const problems = validateDesign(design);
  if (problems.length > 0) {
    throw new InvalidCertificateDesignError(problems.join(" "));
  }
}

/**
 * Contraste (rapport WCAG) entre deux couleurs `#RRGGBB`. Sert à avertir l'administrateur d'un texte illisible sur
 * le fond blanc du certificat ; ne bloque rien.
 */
export function contrastRatio(foreground: string, background = "#ffffff"): number {
  const luminance = (hex: string): number => {
    const [r, g, b] = [1, 3, 5].map((index) => {
      const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Seuil WCAG AA pour du texte courant. */
export const MIN_READABLE_CONTRAST = 4.5;

/** Avertissements de lisibilité (texte clair sur fond blanc) ; une liste vide signifie « rien à signaler ». */
export function readabilityWarnings(design: CertificateDesign): string[] {
  const resolved = resolveDesign(design);
  const warnings: string[] = [];
  if (contrastRatio(resolved.textColor) < MIN_READABLE_CONTRAST) warnings.push("Le texte principal est peu lisible sur fond blanc.");
  if (contrastRatio(resolved.secondaryColor) < 3) warnings.push("Le texte secondaire est peu lisible sur fond blanc.");
  if (contrastRatio(resolved.primaryColor) < MIN_READABLE_CONTRAST) warnings.push("Le nom de l'apprenant (couleur d'accent) est peu lisible sur fond blanc.");
  return warnings;
}
