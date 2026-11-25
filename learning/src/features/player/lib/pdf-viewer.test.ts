import { describe, expect, it } from "vitest";

import { pdfViewerSrc } from "./pdf-viewer";

describe("pdfViewerSrc", () => {
  it("masque la barre quand le téléchargement est interdit", () => {
    expect(pdfViewerSrc("https://cdn.example/doc.pdf?sig=abc", false)).toBe(
      "https://cdn.example/doc.pdf?sig=abc#toolbar=0&navpanes=0&view=FitH",
    );
  });

  it("garde la barre quand le téléchargement est autorisé", () => {
    expect(pdfViewerSrc("https://cdn.example/doc.pdf", true)).toBe("https://cdn.example/doc.pdf#view=FitH");
  });

  it("remplace un fragment existant au lieu de l'empiler", () => {
    expect(pdfViewerSrc("https://cdn.example/doc.pdf#toolbar=1", false)).toBe(
      "https://cdn.example/doc.pdf#toolbar=0&navpanes=0&view=FitH",
    );
  });
});
