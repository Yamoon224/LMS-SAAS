import { z } from "zod";

/**
 * Réglages d'apparence d'un modèle de certificat (formulaire + conversion vers le `design` du backend).
 * Doit rester cohérent avec backend/.../certificates/domain/certificate-design.ts (listes blanches et bornes).
 * Ce fichier est identique côté admin et côté business.
 */
export const FONT_FAMILIES = ["HELVETICA", "TIMES", "COURIER"] as const;
export const ORIENTATIONS = ["LANDSCAPE", "PORTRAIT"] as const;
export const PAGE_FORMATS = ["A4", "LETTER"] as const;
export const BORDER_STYLES = ["NONE", "SIMPLE", "DOUBLE", "ORNATE"] as const;
export const LOGO_POSITIONS = ["LEFT", "CENTER", "RIGHT"] as const;
export const LOGO_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export const WATERMARK_TYPES = ["NONE", "TEXT", "LOGO"] as const;
export const LANGUAGES = ["FR", "EN", "AR", "ZH", "RU", "TR"] as const;
export const TEXT_VARIABLES = ["learnerName", "courseTitle", "date", "score", "certificateNumber"] as const;

export const FONT_LABELS: Record<(typeof FONT_FAMILIES)[number], string> = {
  HELVETICA: "Sans empattement (Helvetica)",
  TIMES: "Avec empattements (Times)",
  COURIER: "Machine à écrire (Courier)",
};
export const ORIENTATION_LABELS: Record<(typeof ORIENTATIONS)[number], string> = {
  LANDSCAPE: "Paysage",
  PORTRAIT: "Portrait",
};
export const PAGE_FORMAT_LABELS: Record<(typeof PAGE_FORMATS)[number], string> = { A4: "A4", LETTER: "Letter (US)" };
export const BORDER_LABELS: Record<(typeof BORDER_STYLES)[number], string> = {
  NONE: "Aucune",
  SIMPLE: "Simple",
  DOUBLE: "Double",
  ORNATE: "Ornée",
};
export const LOGO_POSITION_LABELS: Record<(typeof LOGO_POSITIONS)[number], string> = {
  LEFT: "À gauche",
  CENTER: "Au centre",
  RIGHT: "À droite",
};
export const LOGO_SIZE_LABELS: Record<(typeof LOGO_SIZES)[number], string> = {
  SMALL: "Petit",
  MEDIUM: "Moyen",
  LARGE: "Grand",
};
export const WATERMARK_LABELS: Record<(typeof WATERMARK_TYPES)[number], string> = {
  NONE: "Aucun",
  TEXT: "Texte",
  LOGO: "Logo",
};
export const LANGUAGE_LABELS: Record<(typeof LANGUAGES)[number], string> = {
  FR: "Français",
  EN: "Anglais",
  AR: "Arabe (de droite à gauche)",
  ZH: "Chinois (simplifié)",
  RU: "Russe",
  TR: "Turc",
};

export const DEFAULT_COLORS = { primaryColor: "#1e3a8a", textColor: "#111827", secondaryColor: "#6b7280" } as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const hexColor = (label: string) => z.string().regex(HEX, `${label} : couleur au format #RRGGBB.`);
/** Vide = valeur par défaut. */
const optionalHex = (label: string) => z.union([z.literal(""), hexColor(label)]);

export function isHttpUrl(value: string): boolean {
  if (value.length > 500 || /[\s<>"'`\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}
const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || isHttpUrl(value), "URL http(s) valide requise (500 caractères maximum).");

const plainText = (max: number) =>
  z
    .string()
    .max(max, `${max} caractères maximum.`)
    .refine((value) => !/[<>]/.test(value), "Les caractères « < » et « > » ne sont pas autorisés.");

function unknownVariables(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([A-Za-z]+)\s*\}\}/g)]
    .map((match) => match[1] as string)
    .filter((name) => !(TEXT_VARIABLES as readonly string[]).includes(name));
}
const textWithVariables = (max: number) =>
  plainText(max).refine((value) => unknownVariables(value).length === 0, "Variable inconnue : utilisez uniquement les variables proposées.");

export const designFormSchema = z.object({
  // Mise en page
  orientation: z.enum(ORIENTATIONS),
  pageFormat: z.enum(PAGE_FORMATS),
  borderStyle: z.enum(BORDER_STYLES),
  borderColor: optionalHex("Couleur de bordure"),
  backgroundColor: hexColor("Couleur de fond"),
  backgroundUrl: optionalUrl,
  backgroundOpacity: z.number().min(0).max(1),
  logoUrl: optionalUrl,
  logoPosition: z.enum(LOGO_POSITIONS),
  logoSize: z.enum(LOGO_SIZES),
  badgeUrl: optionalUrl,
  watermarkType: z.enum(WATERMARK_TYPES),
  watermarkText: plainText(40),
  watermarkOpacity: z.number().min(0.02).max(0.3),
  // Couleurs & police
  primaryColor: hexColor("Couleur principale"),
  secondaryColor: hexColor("Couleur secondaire"),
  textColor: hexColor("Couleur du texte"),
  fontFamily: z.enum(FONT_FAMILIES),
  // Contenu
  language: z.enum(LANGUAGES),
  title: textWithVariables(80),
  bodyText: textWithVariables(400),
  footerText: textWithVariables(200),
  // Signatures
  signatory1Name: plainText(80),
  signatory1Title: plainText(80),
  signatory1ImageUrl: optionalUrl,
  signatory2Name: plainText(80),
  signatory2Title: plainText(80),
  signatory2ImageUrl: optionalUrl,
  // Éléments affichés
  showScore: z.boolean(),
  showDate: z.boolean(),
  showNumber: z.boolean(),
  showDuration: z.boolean(),
  showQrCode: z.boolean(),
});
export type DesignFormValues = z.infer<typeof designFormSchema>;

const signatorySchema = z.object({ name: z.string(), title: z.string().optional(), imageUrl: z.string().optional() });

/** Design tel que renvoyé par le backend : tout est optionnel (anciens modèles). */
export const designSchema = z.object({
  logoUrl: z.string().optional(),
  badgeUrl: z.string().optional(),
  signatureName: z.string().optional(),
  signatureImageUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  textColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.enum(FONT_FAMILIES).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
  borderStyle: z.enum(BORDER_STYLES).optional(),
  pageFormat: z.enum(PAGE_FORMATS).optional(),
  borderColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  backgroundOpacity: z.number().optional(),
  logoPosition: z.enum(LOGO_POSITIONS).optional(),
  logoSize: z.enum(LOGO_SIZES).optional(),
  watermarkType: z.enum(WATERMARK_TYPES).optional(),
  watermarkText: z.string().optional(),
  watermarkOpacity: z.number().optional(),
  title: z.string().optional(),
  bodyText: z.string().optional(),
  footerText: z.string().optional(),
  language: z.enum(LANGUAGES).optional(),
  showScore: z.boolean().optional(),
  showDate: z.boolean().optional(),
  showNumber: z.boolean().optional(),
  showDuration: z.boolean().optional(),
  showQrCode: z.boolean().optional(),
  signatories: signatorySchema.array().optional(),
});
export type CertificateDesignData = z.infer<typeof designSchema>;

export const DEFAULT_DESIGN_VALUES: DesignFormValues = {
  orientation: "LANDSCAPE",
  pageFormat: "A4",
  borderStyle: "NONE",
  borderColor: "",
  backgroundColor: "#ffffff",
  backgroundUrl: "",
  backgroundOpacity: 1,
  logoUrl: "",
  logoPosition: "CENTER",
  logoSize: "MEDIUM",
  badgeUrl: "",
  watermarkType: "NONE",
  watermarkText: "",
  watermarkOpacity: 0.08,
  ...DEFAULT_COLORS,
  fontFamily: "HELVETICA",
  language: "FR",
  title: "",
  bodyText: "",
  footerText: "",
  signatory1Name: "",
  signatory1Title: "",
  signatory1ImageUrl: "",
  signatory2Name: "",
  signatory2Title: "",
  signatory2ImageUrl: "",
  showScore: true,
  showDate: true,
  showNumber: true,
  showDuration: false,
  showQrCode: true,
};

/** Valeurs du formulaire pour un design existant ; l'ancienne signature unique devient le signataire 1. */
export function designToFormValues(design?: CertificateDesignData | null): DesignFormValues {
  const d = design ?? {};
  const [first, second] = d.signatories ?? [];
  const legacy = !first && d.signatureName ? { name: d.signatureName, title: undefined, imageUrl: d.signatureImageUrl } : undefined;
  const one = first ?? legacy;
  return {
    ...DEFAULT_DESIGN_VALUES,
    orientation: d.orientation ?? "LANDSCAPE",
    pageFormat: d.pageFormat ?? "A4",
    borderStyle: d.borderStyle ?? "NONE",
    borderColor: d.borderColor ?? "",
    backgroundColor: d.backgroundColor ?? "#ffffff",
    backgroundUrl: d.backgroundUrl ?? "",
    backgroundOpacity: d.backgroundOpacity ?? 1,
    logoUrl: d.logoUrl ?? "",
    logoPosition: d.logoPosition ?? "CENTER",
    logoSize: d.logoSize ?? "MEDIUM",
    badgeUrl: d.badgeUrl ?? "",
    watermarkType: d.watermarkType ?? "NONE",
    watermarkText: d.watermarkText ?? "",
    watermarkOpacity: d.watermarkOpacity ?? 0.08,
    primaryColor: d.primaryColor && HEX.test(d.primaryColor) ? d.primaryColor : DEFAULT_COLORS.primaryColor,
    secondaryColor: d.secondaryColor && HEX.test(d.secondaryColor) ? d.secondaryColor : DEFAULT_COLORS.secondaryColor,
    textColor: d.textColor && HEX.test(d.textColor) ? d.textColor : DEFAULT_COLORS.textColor,
    fontFamily: d.fontFamily ?? "HELVETICA",
    language: d.language ?? "FR",
    title: d.title ?? "",
    bodyText: d.bodyText ?? "",
    footerText: d.footerText ?? "",
    signatory1Name: one?.name ?? "",
    signatory1Title: one?.title ?? "",
    signatory1ImageUrl: one?.imageUrl ?? "",
    signatory2Name: second?.name ?? "",
    signatory2Title: second?.title ?? "",
    signatory2ImageUrl: second?.imageUrl ?? "",
    showScore: d.showScore ?? true,
    showDate: d.showDate ?? true,
    showNumber: d.showNumber ?? true,
    showDuration: d.showDuration ?? false,
    showQrCode: d.showQrCode ?? true,
  };
}

function signatory(name: string, title: string, imageUrl: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return { name: trimmed, ...(title.trim() ? { title: title.trim() } : {}), ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}) };
}

/** `design` envoyé au backend : les champs vides sont omis (valeurs par défaut côté rendu). */
export function designFromFormValues(values: DesignFormValues): CertificateDesignData {
  const text = (key: string, value: string) => (value.trim() === "" ? {} : { [key]: value.trim() });
  const signatories = [
    signatory(values.signatory1Name, values.signatory1Title, values.signatory1ImageUrl),
    signatory(values.signatory2Name, values.signatory2Title, values.signatory2ImageUrl),
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  return {
    orientation: values.orientation,
    pageFormat: values.pageFormat,
    borderStyle: values.borderStyle,
    backgroundColor: values.backgroundColor,
    backgroundOpacity: values.backgroundOpacity,
    logoPosition: values.logoPosition,
    logoSize: values.logoSize,
    watermarkType: values.watermarkType,
    watermarkOpacity: values.watermarkOpacity,
    primaryColor: values.primaryColor,
    secondaryColor: values.secondaryColor,
    textColor: values.textColor,
    fontFamily: values.fontFamily,
    language: values.language,
    showScore: values.showScore,
    showDate: values.showDate,
    showNumber: values.showNumber,
    showDuration: values.showDuration,
    showQrCode: values.showQrCode,
    ...text("borderColor", values.borderColor),
    ...text("backgroundUrl", values.backgroundUrl),
    ...text("logoUrl", values.logoUrl),
    ...text("badgeUrl", values.badgeUrl),
    ...text("watermarkText", values.watermarkText),
    ...text("title", values.title),
    ...text("bodyText", values.bodyText),
    ...text("footerText", values.footerText),
    ...(signatories.length > 0 ? { signatories } : {}),
  };
}

/** Champs du formulaire par onglet (pour signaler un onglet en erreur). */
export const DESIGN_TAB_FIELDS: Record<string, (keyof DesignFormValues)[]> = {
  layout: ["orientation", "pageFormat", "borderStyle", "borderColor", "backgroundColor", "backgroundUrl", "backgroundOpacity", "logoUrl", "logoPosition", "logoSize", "badgeUrl", "watermarkType", "watermarkText", "watermarkOpacity"],
  colors: ["primaryColor", "secondaryColor", "textColor", "fontFamily"],
  content: ["language", "title", "bodyText", "footerText"],
  signatures: ["signatory1Name", "signatory1Title", "signatory1ImageUrl", "signatory2Name", "signatory2Title", "signatory2ImageUrl"],
  display: ["showScore", "showDate", "showNumber", "showDuration", "showQrCode"],
};
