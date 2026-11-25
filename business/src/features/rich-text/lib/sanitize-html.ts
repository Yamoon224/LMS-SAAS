import { normalizeHttpsUrl } from "./url";

/**
 * Assainissement CÔTÉ CLIENT du HTML produit par l'éditeur, avant envoi (ENT-23). Seconde ligne de défense :
 * le backend reste l'autorité (liste blanche `sanitize-html`, BE-09). Le HTML traité est celui de `editor.getHTML()`
 * (balises bien formées, attributs entre guillemets) : un découpage par balises suffit ici et reste testable sans DOM.
 *
 * Règles : balises de la liste blanche uniquement (les autres sont retirées, leur texte conservé, sauf script/style/
 * iframe/object/embed/svg/math dont le contenu est supprimé) ; attributs de la liste blanche uniquement ; liens et
 * images en https seulement ; aucun gestionnaire d'événement ni attribut `style`.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "strong", "em", "u", "s", "ul", "ol", "li", "blockquote",
  "pre", "code", "a", "img", "table", "thead", "tbody", "tr", "th", "td",
]);
const VOID_TAGS = new Set(["br", "hr", "img"]);
const DROP_CONTENT_TAGS = ["script", "style", "iframe", "object", "embed", "svg", "math", "template", "noscript"];

const DROP_BLOCKS = new RegExp(`<(${DROP_CONTENT_TAGS.join("|")})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, "gi");
const DROP_SINGLES = new RegExp(`<\\/?(${DROP_CONTENT_TAGS.join("|")})\\b[^>]*>`, "gi");
const COMMENTS = /<!--[\s\S]*?-->/g;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g;
const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type AttributeRule = (value: string) => string | null;

function urlAttribute(name: string, extra = ""): AttributeRule {
  return (value) => {
    const url = normalizeHttpsUrl(value);
    return url ? ` ${name}="${escapeAttribute(url)}"${extra}` : null;
  };
}

const textAttribute =
  (name: string): AttributeRule =>
  (value) =>
    ` ${name}="${escapeAttribute(value.slice(0, 300))}"`;

const spanAttribute =
  (name: string): AttributeRule =>
  (value) =>
    /^\d{1,2}$/.test(value) ? ` ${name}="${value}"` : null;

/** Attributs autorisés par balise (liste blanche) ; tout autre attribut est supprimé. */
const ATTRIBUTE_RULES: Record<string, Record<string, AttributeRule>> = {
  a: { href: urlAttribute("href", ' rel="noopener noreferrer nofollow" target="_blank"') },
  img: { src: urlAttribute("src"), alt: textAttribute("alt"), title: textAttribute("title") },
  td: { colspan: spanAttribute("colspan"), rowspan: spanAttribute("rowspan") },
  th: { colspan: spanAttribute("colspan"), rowspan: spanAttribute("rowspan") },
};

function cleanAttributes(tag: string, rawAttributes: string): string {
  const rules = ATTRIBUTE_RULES[tag];
  if (!rules) return "";
  let kept = "";
  for (const match of rawAttributes.matchAll(ATTRIBUTE)) {
    const rule = rules[(match[1] ?? "").toLowerCase()];
    kept += rule?.(decodeEntities(match[2] ?? match[3] ?? "")) ?? "";
  }
  return kept;
}

/** Une image sans `src` valide n'a aucun sens : elle est retirée plutôt que laissée vide. */
function renderTag(closing: string, rawName: string, rawAttributes: string, output: string[]): void {
  const tag = rawName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return;
  if (closing) {
    if (!VOID_TAGS.has(tag)) output.push(`</${tag}>`);
    return;
  }
  const attributes = cleanAttributes(tag, rawAttributes);
  if (tag === "img" && !attributes.includes(" src=")) return;
  output.push(VOID_TAGS.has(tag) ? `<${tag}${attributes} />` : `<${tag}${attributes}>`);
}

export function sanitizeEditorHtml(html: string): string {
  const stripped = html.replace(COMMENTS, "").replace(DROP_BLOCKS, "").replace(DROP_SINGLES, "");
  const output: string[] = [];
  let cursor = 0;
  for (const match of stripped.matchAll(TAG)) {
    const index = match.index ?? 0;
    output.push(neutralizeText(stripped.slice(cursor, index)));
    renderTag(match[1] ?? "", match[2] ?? "", match[3] ?? "", output);
    cursor = index + match[0].length;
  }
  output.push(neutralizeText(stripped.slice(cursor)));
  return output.join("");
}

/** Le texte entre balises ne doit contenir aucun chevron brut (balise mal formée laissée par un collage). */
function neutralizeText(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Vrai si le HTML ne contient aucun texte ni média (éditeur « vide » : `<p></p>`). */
export function isEditorHtmlEmpty(html: string): boolean {
  return html.replace(/<(?!img\b)[^>]*>/gi, "").replace(/&nbsp;|\s/g, "").length === 0;
}
