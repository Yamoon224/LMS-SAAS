/**
 * Réordonnancement bidirectionnel SIMPLIFIÉ pour les textes arabes (PDFKit ne le fait pas).
 *
 * Modèle volontairement réduit (algorithme UAX #9 partiel) :
 *  - « R » : lettres arabes/hébraïques ; « L » : autres lettres ; « D » : chiffres ; « N » : neutres (espaces,
 *    ponctuation) qui prennent le sens de leurs voisins, ou celui du paragraphe s'ils sont entre deux sens différents ;
 *  - le sens du paragraphe est celui du premier caractère fort ;
 *  - niveaux : 0 = LTR (paragraphe LTR), 1 = RTL, 2 = LTR dans un paragraphe RTL.
 * Non gérés : embeddings et overrides explicites (LRE, RLO…), isolats, appariement des parenthèses imbriquées (elles
 * sont seulement « miroitées » dans les runs RTL), nombres arabo-indiques composés.
 */
export type CharClass = "R" | "L" | "D" | "N";

export function classify(char: string): CharClass {
  const cp = char.codePointAt(0) ?? 0;
  // Chiffres arabo-indiques et persans : traités comme des chiffres (run LTR).
  if ((cp >= 0x0660 && cp <= 0x0669) || (cp >= 0x06f0 && cp <= 0x06f9) || (cp >= 0x30 && cp <= 0x39)) return "D";
  // Ponctuation arabe (virgule, point-virgule, point d'interrogation, séparateurs décimaux) : neutre.
  if (cp === 0x060c || cp === 0x061b || cp === 0x061f || cp === 0x066b || cp === 0x066c || cp === 0x066a) return "N";
  const strongRtl =
    (cp >= 0x0590 && cp <= 0x08ff) || (cp >= 0xfb1d && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);
  if (strongRtl) return "R";
  if (/\p{L}|\p{M}/u.test(char)) return "L";
  return "N";
}

const NUMBER_SEPARATORS = new Set([",", ".", ":", "/", "-", "٫", "٬"]);
const MIRRORS: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "«": "»",
  "»": "«",
};

const CURRENCIES = new Set(["$", "€", "£", "¥"]);
const OPENERS = new Set(["(", "[", "{", "<", "«"]);
const CLOSERS = new Set([")", "]", "}", ">", "»"]);

export interface BidiRun {
  text: string;
  /** true : run arabe à tracer par fontkit, qui inverse lui-même l'ordre des glyphes d'un run RTL. */
  rtl: boolean;
}

export interface BidiAnalysis {
  rtlParagraph: boolean;
  chars: string[];
  levels: number[];
}

export function analyze(text: string): BidiAnalysis {
  const chars = Array.from(text);
  const classes = chars.map(classify);
  const rtlParagraph = classes.find((c) => c === "R" || c === "L") === "R";
  const base = rtlParagraph ? 1 : 0;
  const ltr = rtlParagraph ? 2 : 0;

  // -1 = neutre à résoudre.
  const levels: number[] = classes.map((c) => (c === "R" ? 1 : c === "N" ? -1 : ltr));
  // Séparateurs de nombres (1,000 ; 12/05 ; 10:30) : restent dans le run des chiffres.
  for (let i = 1; i < chars.length - 1; i++) {
    if (classes[i] === "N" && NUMBER_SEPARATORS.has(chars[i] ?? "") && classes[i - 1] === "D" && classes[i + 1] === "D") {
      levels[i] = ltr;
    }
  }
  // Pourcentage collé au nombre qui le précède (88%), devise collée au nombre qui la suit (€10).
  for (let i = 0; i < chars.length; i++) {
    if (classes[i] !== "N") continue;
    const char = chars[i] ?? "";
    if ((char === "%" || char === "‰") && i > 0 && classes[i - 1] === "D") levels[i] = ltr;
    if (CURRENCIES.has(char) && classes[i + 1] === "D") levels[i] = ltr;
  }
  // Parenthèses appariées : elles suivent le contenu qu'elles entourent (« (ABC) » reste intact dans un texte arabe).
  const stack: number[] = [];
  chars.forEach((char, index) => {
    if (OPENERS.has(char)) {
      stack.push(index);
    } else if (CLOSERS.has(char) && stack.length > 0) {
      const open = stack.pop() ?? 0;
      if (MIRRORS[chars[open] ?? ""] !== char) return;
      const inner = classes.slice(open + 1, index);
      const hasRtl = inner.includes("R");
      const hasLtr = inner.includes("L") || inner.includes("D");
      if (hasLtr && !hasRtl) levels[open] = levels[index] = ltr;
      else if (hasRtl && !hasLtr) levels[open] = levels[index] = 1;
    }
  });
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] !== -1) continue;
    let j = i;
    while (j < levels.length && levels[j] === -1) j++;
    const before = i > 0 ? (levels[i - 1] ?? base) : base;
    const after = j < levels.length ? (levels[j] ?? base) : base;
    const resolved = before === after ? before : base;
    for (let k = i; k < j; k++) levels[k] = resolved;
    i = j - 1;
  }
  return { rtlParagraph, chars, levels };
}

interface LevelRun {
  text: string;
  level: number;
}

function runsOfRange(analysis: BidiAnalysis, start: number, end: number): LevelRun[] {
  const runs: LevelRun[] = [];
  for (let i = start; i < end; i++) {
    const level = analysis.levels[i] ?? 0;
    const char = analysis.chars[i] ?? "";
    const last = runs[runs.length - 1];
    if (last && last.level === level) last.text += char;
    else runs.push({ text: char, level });
  }
  return runs;
}

/**
 * Runs de la plage [start, end) dans l'ORDRE VISUEL (de gauche à droite). Paragraphe RTL : l'ordre des runs est
 * inversé ; paragraphe LTR : seules les suites de runs RTL sont inversées entre elles.
 */
export function visualRuns(analysis: BidiAnalysis, start: number, end: number): BidiRun[] {
  const logical = runsOfRange(analysis, start, end);
  let ordered: LevelRun[];
  if (analysis.rtlParagraph) {
    ordered = [...logical].reverse();
  } else {
    ordered = [];
    let group: LevelRun[] = [];
    for (const run of logical) {
      if (run.level === 1) {
        group.push(run);
      } else {
        ordered.push(...group.reverse(), run);
        group = [];
      }
    }
    ordered.push(...group.reverse());
  }
  return ordered.map((run) => ({
    rtl: run.level === 1,
    text: run.level === 1 ? Array.from(run.text, (char) => MIRRORS[char] ?? char).join("") : run.text,
  }));
}
