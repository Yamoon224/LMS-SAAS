import { describe, expect, it } from "vitest";

import { isEditorHtmlEmpty, sanitizeEditorHtml } from "./sanitize-html";
import { normalizeHttpsUrl } from "./url";

describe("normalizeHttpsUrl", () => {
  it("accepte une URL https et la normalise", () => {
    expect(normalizeHttpsUrl(" https://exemple.com/page?x=1 ")).toBe("https://exemple.com/page?x=1");
  });

  it.each([
    "http://exemple.com",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "mailto:a@b.c",
    "//exemple.com",
    "https://exem ple.com",
    "https://exemple.com/\"onload=\"x",
    "",
    `https://exemple.com/${"a".repeat(2100)}`,
  ])("refuse %j", (value) => {
    expect(normalizeHttpsUrl(value)).toBeNull();
  });
});

describe("sanitizeEditorHtml", () => {
  it("conserve la mise en forme autorisée", () => {
    const html = "<h2>Titre</h2><p><strong>gras</strong> et <em>italique</em></p><ul><li>a</li></ul><blockquote>cit</blockquote>";
    expect(sanitizeEditorHtml(html)).toBe(html);
  });

  it("supprime les scripts avec leur contenu", () => {
    expect(sanitizeEditorHtml("<p>ok</p><script>alert(1)</script>")).toBe("<p>ok</p>");
    expect(sanitizeEditorHtml("<style>p{}</style><p>ok</p>")).toBe("<p>ok</p>");
    expect(sanitizeEditorHtml('<iframe src="https://x.io"></iframe><p>ok</p>')).toBe("<p>ok</p>");
  });

  it("retire les gestionnaires d'événements et le style", () => {
    const out = sanitizeEditorHtml('<p onclick="alert(1)" style="color:red">x</p>');
    expect(out).toBe("<p>x</p>");
  });

  it("n'autorise que les liens https, avec rel sécurisé", () => {
    expect(sanitizeEditorHtml('<a href="https://exemple.com/a">lien</a>')).toBe(
      '<a href="https://exemple.com/a" rel="noopener noreferrer nofollow" target="_blank">lien</a>',
    );
    expect(sanitizeEditorHtml('<a href="javascript:alert(1)">piège</a>')).toBe("<a>piège</a>");
    expect(sanitizeEditorHtml('<a href="http://exemple.com">http</a>')).toBe("<a>http</a>");
    expect(sanitizeEditorHtml("<a href='data:text/html,x'>d</a>")).toBe("<a>d</a>");
  });

  it("n'autorise que les images https et retire les autres", () => {
    expect(sanitizeEditorHtml('<img src="https://exemple.com/i.png" alt="a" onerror="x()">')).toBe(
      '<img src="https://exemple.com/i.png" alt="a" />',
    );
    expect(sanitizeEditorHtml('<img src="javascript:alert(1)">')).toBe("");
    expect(sanitizeEditorHtml('<img src="data:image/png;base64,AAAA">')).toBe("");
    expect(sanitizeEditorHtml('<img src="http://exemple.com/i.png">')).toBe("");
  });

  it("retire les balises inconnues en gardant leur texte", () => {
    expect(sanitizeEditorHtml("<div><marquee>texte</marquee></div>")).toBe("texte");
  });

  it("neutralise les chevrons orphelins et les balises mal formées", () => {
    expect(sanitizeEditorHtml("<p>a < b > c</p>")).toBe("<p>a &lt; b &gt; c</p>");
    expect(sanitizeEditorHtml("<p>x</p><scr<script>ipt>alert(1)</script>")).not.toContain("<script");
  });

  it("supprime les commentaires", () => {
    expect(sanitizeEditorHtml("<p>a</p><!-- <script>x</script> -->")).toBe("<p>a</p>");
  });

  it("conserve les tableaux avec spans bornés", () => {
    const out = sanitizeEditorHtml('<table><tbody><tr><th colspan="2">h</th></tr><tr><td colspan="999">c</td></tr></tbody></table>');
    expect(out).toContain('<th colspan="2">');
    expect(out).toBe('<table><tbody><tr><th colspan="2">h</th></tr><tr><td>c</td></tr></tbody></table>');
  });
});

describe("isEditorHtmlEmpty", () => {
  it("détecte un éditeur vide", () => {
    expect(isEditorHtmlEmpty("<p></p>")).toBe(true);
    expect(isEditorHtmlEmpty("<p>&nbsp; </p>")).toBe(true);
    expect(isEditorHtmlEmpty("<p>a</p>")).toBe(false);
    expect(isEditorHtmlEmpty('<p></p><img src="https://x.io/a.png" />')).toBe(false);
  });
});
