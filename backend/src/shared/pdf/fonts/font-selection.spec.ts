import { containsArabic, detectScript, pickFontName } from "./font-selection";

describe("sélection de la police PDF", () => {
  it.each([
    ["Certificat de réussite — Awa Koné, 92 % « Excel »", "standard"],
    ["Ñandú, Größe, œuvre, €", "standard"],
    ["شهادة نجاح", "arabic"],
    ["Entreprise — شهادة", "arabic"],
    ["结业证书", "cjk"],
    ["Курс: Основы", "extended"],
    ["İstanbul, ğ ş ı", "extended"],
    ["张伟 Awa", "cjk"],
  ] as const)("%s -> %s", (text, script) => {
    expect(detectScript(text)).toBe(script);
  });

  it("garde la police standard pour le latin (aucune régression)", () => {
    expect(pickFontName("Excel avancé", "Helvetica")).toBeNull();
    expect(pickFontName("Excel avancé", "Times-Bold")).toBeNull();
  });

  it("choisit la famille Noto et conserve la graisse", () => {
    expect(pickFontName("شهادة", "Helvetica")).toBe("NotoSansArabic-Regular");
    expect(pickFontName("شهادة", "Helvetica-Bold")).toBe("NotoSansArabic-Bold");
    expect(pickFontName("证书", "Times-Roman")).toBe("NotoSansSC-Regular");
    expect(pickFontName("证书", "Courier-Bold")).toBe("NotoSansSC-Bold");
    expect(pickFontName("Сертификат", "Helvetica")).toBe("NotoSans-Regular");
    expect(pickFontName("Türkçe ğ", "Helvetica-Bold")).toBe("NotoSans-Bold");
  });

  it("détecte l'arabe", () => {
    expect(containsArabic("abc شهادة")).toBe(true);
    expect(containsArabic("abc 中文")).toBe(false);
  });
});
