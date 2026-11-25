/**
 * Choix de la police d'un texte selon ses caractères (fonctions pures, sans dépendance à PDFKit).
 *
 * Les polices PDF standard (Helvetica, Times, Courier) ne savent écrire que le jeu WinAnsi (Windows-1252) : français,
 * anglais, espagnol, allemand. Dès qu'un texte contient un autre caractère (arabe, chinois, cyrillique, turc ğ ş İ ı…),
 * on bascule sur une police Noto embarquée. Une seule police par chaîne : voir « limites » dans docs/etapes/37.
 */
export type FontScript = "standard" | "arabic" | "cjk" | "extended";

/** Familles Noto embarquées (backend/assets/fonts). */
export type NotoFamily = "NotoSans" | "NotoSansArabic" | "NotoSansSC";

/** Caractères hors Latin-1 présents dans WinAnsi (0x80-0x9F) : euro, guillemets, tirets, puces, etc. */
const WIN_ANSI_EXTRAS = new Set<number>([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019,
  0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

export function isArabicCodePoint(cp: number): boolean {
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  );
}

export function isCjkCodePoint(cp: number): boolean {
  return (
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    (cp >= 0x20000 && cp <= 0x2fa1f)
  );
}

function isStandardCodePoint(cp: number): boolean {
  // Contrôles et marques de format (retours à la ligne, marques directionnelles) : sans effet sur le choix.
  if (cp < 0x20 || (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e)) return true;
  return cp <= 0x7e || (cp >= 0xa0 && cp <= 0xff) || WIN_ANSI_EXTRAS.has(cp);
}

/** Script à servir : arabe > chinois > autre alphabet (cyrillique, turc, grec…) > standard. */
export function detectScript(text: string): FontScript {
  let result: FontScript = "standard";
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (isArabicCodePoint(cp)) return "arabic";
    if (isCjkCodePoint(cp)) result = "cjk";
    else if (result === "standard" && !isStandardCodePoint(cp)) result = "extended";
  }
  return result;
}

export function familyForScript(script: Exclude<FontScript, "standard">): NotoFamily {
  if (script === "arabic") return "NotoSansArabic";
  if (script === "cjk") return "NotoSansSC";
  return "NotoSans";
}

/**
 * Police à utiliser pour `text`. `standardFont` est la police standard demandée (« Helvetica-Bold »…) : le gras est
 * conservé. Renvoie `null` quand la police standard suffit (aucune régression pour le latin).
 */
export function pickFontName(text: string, standardFont: string): string | null {
  const script = detectScript(text);
  if (script === "standard") return null;
  return `${familyForScript(script)}-${/bold/i.test(standardFont) ? "Bold" : "Regular"}`;
}

/** Texte contenant de l'arabe : nécessite mise en forme contextuelle et réordonnancement bidirectionnel. */
export function containsArabic(text: string): boolean {
  for (const char of text) if (isArabicCodePoint(char.codePointAt(0) ?? 0)) return true;
  return false;
}
