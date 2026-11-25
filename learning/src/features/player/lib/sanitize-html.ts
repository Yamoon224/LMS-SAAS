/**
 * Défense en profondeur : le backend stocke déjà du HTML assaini, mais on ne
 * l'injecte jamais tel quel. Transformation DOM par liste blanche (aucune
 * dépendance) : balises/attributs inconnus retirés, scripts et contenus actifs
 * supprimés, liens forcés en target=_blank rel="noopener noreferrer".
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "S", "SUB", "SUP", "SPAN", "DIV",
  "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "HR",
  "A", "IMG", "FIGURE", "FIGCAPTION", "CODE", "PRE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD",
]);
/** Supprimés avec leur contenu (jamais "déballés"). */
const DROP_WITH_CONTENT = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "SVG", "MATH",
  "LINK", "META", "BASE", "NOSCRIPT", "TEMPLATE", "VIDEO", "AUDIO", "CANVAS",
]);
const SAFE_LINK = /^(https?:|mailto:|tel:)/i;
const SAFE_IMG = /^https?:/i;

/** Attributs conservés pour une balise autorisée ; null = l'élément doit être supprimé. */
function keptAttributes(el: Element, tag: string): Record<string, string> | null {
  const keep: Record<string, string> = {};
  if (tag === "A") {
    const href = (el.getAttribute("href") ?? "").trim();
    if (SAFE_LINK.test(href)) keep.href = href;
  } else if (tag === "IMG") {
    const src = (el.getAttribute("src") ?? "").trim();
    if (!SAFE_IMG.test(src)) return null;
    keep.src = src;
    keep.alt = el.getAttribute("alt") ?? "";
  } else if (tag === "TD" || tag === "TH") {
    for (const name of ["colspan", "rowspan"]) {
      const value = el.getAttribute(name);
      if (value && /^\d{1,2}$/.test(value)) keep[name] = value;
    }
  }
  return keep;
}

function decorate(el: Element, tag: string): void {
  if (tag === "A") {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  }
  if (tag === "IMG") {
    el.setAttribute("loading", "lazy");
    el.setAttribute("decoding", "async");
    el.setAttribute("referrerpolicy", "no-referrer");
  }
}

function unwrap(el: Element, parent: Node): void {
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function sanitizeElement(el: Element, parent: Node): void {
  const tag = el.tagName.toUpperCase();
  if (DROP_WITH_CONTENT.has(tag)) {
    parent.removeChild(el);
    return;
  }
  sanitizeChildren(el);
  if (!ALLOWED_TAGS.has(tag)) {
    unwrap(el, parent); // balise inconnue : on garde le texte/enfants déjà nettoyés
    return;
  }
  const keep = keptAttributes(el, tag);
  if (!keep) {
    parent.removeChild(el);
    return;
  }
  for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
  for (const [name, value] of Object.entries(keep)) el.setAttribute(name, value);
  decorate(el, tag);
}

function sanitizeChildren(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.COMMENT_NODE) node.removeChild(child);
    else if (child.nodeType === Node.ELEMENT_NODE) sanitizeElement(child as Element, node);
  }
}

export function sanitizeLessonHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  sanitizeChildren(doc.body);
  return doc.body.innerHTML;
}
