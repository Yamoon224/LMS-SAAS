import sanitizeHtmlLib from "sanitize-html";

/**
 * BE-09: "Nettoyage du HTML issu de CKEditor (liste blanche)". Autorise les
 * balises de mise en forme riche (titres, tableaux, images, vidéos intégrées,
 * blocs de code — ENT-23) tout en retirant scripts, gestionnaires d'événements
 * et balises actives (XSS). Choisi plutôt que DOMPurify/jsdom pour rester un
 * paquet Node pur, sans dépendance DOM ni souci de transformation ESM en test.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "em", "u", "s", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "iframe", // intégrations vidéo (ENT-23)
  "span", "div",
];

const ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height"],
  iframe: ["src", "width", "height", "frameborder", "allow", "allowfullscreen"],
  "*": ["class", "style"],
};

/** Nettoie un contenu HTML CKEditor avant stockage (ENT-23, BE-09). */
export function sanitizeHtml(rawHtml: string): string {
  return sanitizeHtmlLib(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}
