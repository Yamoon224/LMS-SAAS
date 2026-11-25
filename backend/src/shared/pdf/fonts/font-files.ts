import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Polices embarquées : sous-ensembles statiques Noto (licence OFL, voir backend/assets/fonts/OFL-*.txt). */
export const FONT_FILES = [
  "NotoSans-Regular",
  "NotoSans-Bold",
  "NotoSansArabic-Regular",
  "NotoSansArabic-Bold",
  "NotoSansSC-Regular",
  "NotoSansSC-Bold",
] as const;
export type FontFileName = (typeof FONT_FILES)[number];

/**
 * Dossier des polices. En développement (ts-jest, nest start) ce module est dans `src/shared/pdf/fonts`, en production
 * dans `dist/shared/pdf/fonts` : on essaie `<racine>/assets/fonts` (4 niveaux au-dessus) puis la copie faite par
 * nest-cli dans `dist/assets/fonts` (3 niveaux au-dessus). `PDF_FONTS_DIR` permet de forcer un emplacement.
 */
export function resolveFontsDirectory(): string {
  const candidates = [
    process.env.PDF_FONTS_DIR,
    join(__dirname, "..", "..", "..", "..", "assets", "fonts"),
    join(__dirname, "..", "..", "..", "assets", "fonts"),
    join(process.cwd(), "assets", "fonts"),
  ].filter((value): value is string => Boolean(value));
  const found = candidates.find((dir) => existsSync(join(dir, "NotoSans-Regular.ttf")));
  if (!found) throw new Error(`Polices PDF introuvables (cherché dans : ${candidates.join(", ")})`);
  return found;
}

const cache = new Map<FontFileName, Buffer>();

/** Contenu d'une police, lu une seule fois par processus (la plus lourde, NotoSansSC, pèse ~2,4 Mo). */
export function loadFontBuffer(name: FontFileName): Buffer {
  let buffer = cache.get(name);
  if (!buffer) {
    buffer = readFileSync(join(resolveFontsDirectory(), `${name}.ttf`));
    cache.set(name, buffer);
  }
  return buffer;
}
