import { analyze, visualRuns } from "./bidi";
import type { BidiAnalysis } from "./bidi";
import { FONT_FILES, loadFontBuffer } from "./font-files";
import type { FontFileName } from "./font-files";
import { containsArabic, pickFontName } from "./font-selection";

type Doc = PDFKit.PDFDocument;
type TextOptions = PDFKit.Mixins.TextOptions;

const ELLIPSIS = "…";

function isNotoFont(name: string): boolean {
  return (FONT_FILES as readonly string[]).includes(name);
}

/** Bornes des mots d'un paragraphe : chaque mot inclut les espaces qui le suivent. */
function wordRanges(chars: string[]): { start: number; end: number; textEnd: number }[] {
  const words: { start: number; end: number; textEnd: number }[] = [];
  let i = 0;
  while (i < chars.length) {
    const start = i;
    while (i < chars.length && chars[i] !== " ") i++;
    const textEnd = i;
    while (i < chars.length && chars[i] === " ") i++;
    words.push({ start, end: i, textEnd });
  }
  return words;
}

/**
 * Active sur `doc` le texte Unicode : pour chaque appel à `text`, `widthOfString` et `heightOfString`, la police
 * standard demandée (Helvetica, Times, Courier) est remplacée par la police Noto correspondante (même graisse)
 * UNIQUEMENT si le texte contient des caractères hors WinAnsi (arabe, chinois, cyrillique, turc…). Le latin
 * (français, anglais, espagnol, allemand) reste rendu avec les polices standard : aucun changement.
 *
 * Texte arabe : fontkit applique la mise en forme contextuelle OpenType (formes initiale/médiane/finale, ligatures
 * lam-alef) et l'ordre RTL au sein d'un run arabe ; le réordonnancement des runs d'une ligne (mots latins, nombres
 * dans un texte arabe), le retour à la ligne et l'alignement sont faits ici (`bidi.ts`). Voir docs/etapes/37.
 */
export function enableUnicodeText(doc: Doc): Doc {
  const registered = new Set<string>();
  let standardFont = "Helvetica";

  const originalFont = doc.font.bind(doc) as (src: string, ...rest: unknown[]) => Doc;
  const originalText = doc.text.bind(doc) as (text: string, ...rest: unknown[]) => Doc;
  const originalWidth = doc.widthOfString.bind(doc) as (text: string, options?: unknown) => number;
  const originalHeight = doc.heightOfString.bind(doc) as (text: string, options?: unknown) => number;

  const mutable = doc as unknown as Record<string, unknown>;

  mutable.font = (src: unknown, ...rest: unknown[]) => {
    if (typeof src === "string" && !isNotoFont(src)) standardFont = src;
    return originalFont(src as string, ...rest);
  };

  // PDFKit rappelle `widthOfString` pendant `text` : sans garde, l'appel imbriqué restaurerait la police standard.
  let switched = false;

  function withFont<T>(text: string, run: () => T): T {
    if (switched) return run();
    const name = pickFontName(text, standardFont);
    if (!name) return run();
    if (!registered.has(name)) {
      doc.registerFont(name, loadFontBuffer(name as FontFileName));
      registered.add(name);
    }
    originalFont(name);
    switched = true;
    try {
      return run();
    } finally {
      switched = false;
      originalFont(standardFont);
    }
  }

  function measureRange(analysis: BidiAnalysis, start: number, end: number): number {
    return visualRuns(analysis, start, end).reduce(
      (sum, run) => sum + originalWidth(run.text, run.rtl ? { features: [] } : undefined),
      0,
    );
  }

  /** Lignes d'un paragraphe : plages [début, fin) en ordre logique, retour à la ligne glouton sur les espaces. */
  function wrap(analysis: BidiAnalysis, width: number, singleLine: boolean): { start: number; end: number }[] {
    const total = analysis.chars.length;
    if (singleLine || total === 0) return [{ start: 0, end: total }];
    const lines: { start: number; end: number }[] = [];
    let lineStart = 0;
    let lastTextEnd = 0;
    for (const word of wordRanges(analysis.chars)) {
      if (word.start > lineStart && measureRange(analysis, lineStart, word.textEnd) > width) {
        lines.push({ start: lineStart, end: lastTextEnd });
        lineStart = word.start;
      }
      lastTextEnd = word.textEnd;
    }
    lines.push({ start: lineStart, end: total });
    return lines;
  }

  function lineHeight(options: TextOptions | undefined): number {
    return doc.currentLineHeight(true) + (options?.lineGap ?? 0);
  }

  function drawBidi(text: string, x: number | undefined, y: number | undefined, options: TextOptions | undefined): Doc {
    const startX = x ?? doc.x;
    const startY = y ?? doc.y;
    const width = options?.width ?? doc.page.width - doc.page.margins.right - startX;
    const singleLine = options?.lineBreak === false;
    let cursorY = startY;
    for (const paragraph of text.split("\n")) {
      const analysis = analyze(paragraph);
      const lines = wrap(analysis, width, singleLine);
      for (const line of lines) {
        let { end } = line;
        // Ellipse : on retire des caractères de la fin jusqu'à ce que « … » tienne dans la largeur.
        let ellipsis = false;
        if (singleLine && options?.width !== undefined && options.ellipsis && measureRange(analysis, line.start, end) > width) {
          ellipsis = true;
          while (end > line.start && measureRange(analysis, line.start, end) + originalWidth(ELLIPSIS) > width) end--;
        }
        while (end > line.start && analysis.chars[end - 1] === " ") end--;
        const runs = visualRuns(analysis, line.start, end);
        if (ellipsis) runs.splice(analysis.rtlParagraph ? 0 : runs.length, 0, { text: ELLIPSIS, rtl: false });
        const widths = runs.map((run) => originalWidth(run.text, run.rtl ? { features: [] } : undefined));
        const total = widths.reduce((sum, value) => sum + value, 0);
        const align = options?.align ?? "left";
        let cursorX = startX;
        if (align === "center") cursorX = startX + (width - total) / 2;
        else if (align === "right" || (align === "justify" && analysis.rtlParagraph)) cursorX = startX + width - total;
        runs.forEach((run, index) => {
          const runOptions = run.rtl ? { lineBreak: false, features: [] } : { lineBreak: false };
          originalText(run.text, cursorX, cursorY, runOptions);
          cursorX += widths[index] ?? 0;
        });
        cursorY += lineHeight(options);
      }
    }
    doc.x = startX;
    doc.y = cursorY;
    return doc;
  }

  function splitArgs(args: unknown[]): { x?: number; y?: number; options?: TextOptions } {
    const [a, b, c] = args;
    if (typeof a === "number") return { x: a, y: typeof b === "number" ? b : undefined, options: c as TextOptions | undefined };
    return { options: a as TextOptions | undefined };
  }

  mutable.text = (text: unknown, ...args: unknown[]) => {
    const value = String(text ?? "");
    return withFont(value, () => {
      if (!containsArabic(value)) return originalText(value, ...args);
      const { x, y, options } = splitArgs(args);
      return drawBidi(value, x, y, options);
    });
  };

  mutable.widthOfString = (text: unknown, options?: unknown) => {
    const value = String(text ?? "");
    return withFont(value, () => {
      if (!containsArabic(value)) return originalWidth(value, options);
      return value.split("\n").reduce((max, line) => {
        const analysis = analyze(line);
        return Math.max(max, measureRange(analysis, 0, analysis.chars.length));
      }, 0);
    });
  };

  mutable.heightOfString = (text: unknown, options?: unknown) => {
    const value = String(text ?? "");
    return withFont(value, () => {
      if (!containsArabic(value)) return originalHeight(value, options);
      const opts = options as TextOptions | undefined;
      const width = opts?.width ?? doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const lines = value.split("\n").reduce((sum, paragraph) => sum + wrap(analyze(paragraph), width, opts?.lineBreak === false).length, 0);
      return lines * lineHeight(opts);
    });
  };

  return doc;
}
