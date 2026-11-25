/** Utilitaires purs de charte graphique (sans dépendance serveur, testables). */

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseHexColor(value: string | null | undefined): [number, number, number] | null {
  if (!value) return null;
  const hex = value.trim();
  if (!HEX.test(hex)) return null;
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;
  return [
    parseInt(full.slice(1, 3), 16),
    parseInt(full.slice(3, 5), 16),
    parseInt(full.slice(5, 7), 16),
  ];
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Assombrit la couleur jusqu'à un contraste >= 4.5:1 sur fond blanc (texte/liens "primary"). */
function ensureContrastOnWhite(rgb: [number, number, number]): [number, number, number] {
  let current = rgb;
  for (let i = 0; i < 20 && 1.05 / (luminance(current) + 0.05) < 4.5; i++) {
    current = [Math.round(current[0] * 0.9), Math.round(current[1] * 0.9), Math.round(current[2] * 0.9)];
  }
  return current;
}

/** CSS à injecter dans :root pour la couleur primaire du tenant, ou null si invalide. */
export function primaryColorCss(value: string | null | undefined): string | null {
  const rgb = parseHexColor(value);
  if (!rgb) return null;
  const safe = ensureContrastOnWhite(rgb);
  const foreground = luminance(safe) > 0.4 ? "15 23 42" : "255 255 255";
  return `:root{--primary:${safe.join(" ")};--primary-foreground:${foreground};}`;
}
