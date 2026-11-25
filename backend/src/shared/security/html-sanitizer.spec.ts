import { sanitizeHtml } from "./html-sanitizer";

describe("sanitizeHtml (BE-09)", () => {
  it("keeps allowed rich-text tags from CKEditor", () => {
    const input = "<h2>Titre</h2><p>Texte <strong>important</strong></p><ul><li>Point</li></ul>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("strips script tags entirely", () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips inline event handler attributes", () => {
    const result = sanitizeHtml('<img src="x.png" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
  });

  it("strips javascript: URLs in links", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("keeps a safe iframe embed (video integration, ENT-23)", () => {
    const input = '<iframe src="https://www.youtube.com/embed/abc" allowfullscreen></iframe>';
    const result = sanitizeHtml(input);
    expect(result).toContain("<iframe");
    expect(result).toContain("youtube.com");
  });

  it("strips unknown/dangerous tags like <object> and <embed>", () => {
    const result = sanitizeHtml('<object data="evil.swf"></object><embed src="evil.swf">');
    expect(result).not.toContain("<object");
    expect(result).not.toContain("<embed");
  });
});
