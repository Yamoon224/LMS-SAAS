import type { CertificateDesign } from "../domain/certificate-design";

import { PdfKitCertificateRendererAdapter } from "./pdfkit-certificate-renderer.adapter";

const renderer = new PdfKitCertificateRendererAdapter();

async function render(design: CertificateDesign): Promise<string> {
  const buffer = await renderer.render({
    learnerName: "Awa Kone",
    courseTitle: "Excel avancé",
    number: "CERT-2026-0001",
    issuedAt: new Date("2026-11-17T00:00:00Z"),
    scorePercent: 92,
    qrVerificationUrl: "https://exemple.test/verify/CERT-2026-0001",
    design,
  });
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  // Le dictionnaire de page de PDFKit n'est pas compressé : on y lit la taille de page.
  return buffer.toString("latin1");
}

describe("PdfKitCertificateRendererAdapter — design du modèle (ADM-39)", () => {
  it("produit un PDF paysage par défaut", async () => {
    const pdf = await render({});
    expect(pdf).toMatch(/\/MediaBox \[0 0 841\.89 595\.28\]/);
  });

  it("produit un PDF portrait quand le design le demande", async () => {
    const pdf = await render({ orientation: "PORTRAIT" });
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
  });

  it.each([
    ["HELVETICA", "Helvetica"],
    ["TIMES", "Times-Roman"],
    ["COURIER", "Courier"],
  ] as const)("utilise la police %s", async (fontFamily, pdfName) => {
    const pdf = await render({ fontFamily });
    expect(pdf).toContain(`/BaseFont /${pdfName}`);
  });

  it("n'embarque pas les polices non choisies", async () => {
    const pdf = await render({ fontFamily: "TIMES" });
    expect(pdf).not.toContain("/BaseFont /Helvetica");
  });

  it("dessine une bordure simple ou double sans erreur", async () => {
    await expect(render({ borderStyle: "SIMPLE" })).resolves.toBeTruthy();
    await expect(render({ borderStyle: "DOUBLE" })).resolves.toBeTruthy();
  });

  it("ne plante pas et n'écrit aucune valeur libre pour un design corrompu ou ancien", async () => {
    const pdf = await render({
      primaryColor: "javascript:alert(1)",
      textColor: "(rouge)",
      fontFamily: "COMIC_SANS" as never,
      orientation: "DIAGONAL" as never,
      borderStyle: "EXOTIC" as never,
    });
    expect(pdf).not.toContain("javascript:alert");
    expect(pdf).toMatch(/\/MediaBox \[0 0 841\.89 595\.28\]/);
  });

  it("garde les anciens modèles (seulement primaryColor) intacts", async () => {
    await expect(render({ primaryColor: "#123456" })).resolves.toBeTruthy();
  });
});

describe("PdfKitCertificateRendererAdapter — arabe, chinois, russe, turc", () => {
  async function renderWith(language: CertificateDesign["language"], learnerName: string, courseTitle: string): Promise<string> {
    const buffer = await renderer.render({
      learnerName,
      courseTitle,
      number: "CERT-2026-0002",
      issuedAt: new Date("2026-11-17T00:00:00Z"),
      scorePercent: 88,
      durationMinutes: 150,
      qrVerificationUrl: "https://exemple.test/verify/CERT-2026-0002",
      design: { language, footerText: "{{learnerName}}" },
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    return buffer.toString("latin1");
  }

  it("arabe : Noto Sans Arabic embarquée", async () => {
    const pdf = await renderWith("AR", "أحمد بن علي", "مقدمة في تحليل البيانات");
    expect(pdf).toMatch(/\+NotoSansArabic-Bold/);
    expect(pdf).toMatch(/\+NotoSansArabic-Regular/);
  });

  it("chinois : Noto Sans SC embarquée", async () => {
    const pdf = await renderWith("ZH", "张伟", "数据分析入门");
    expect(pdf).toMatch(/\+NotoSansSC-Bold/);
    expect(pdf).toMatch(/\+NotoSansSC-Regular/);
  });

  it("russe et turc : Noto Sans embarquée", async () => {
    expect(await renderWith("RU", "Иван Петров", "Основы анализа данных")).toMatch(/\+NotoSans-Bold/);
    expect(await renderWith("TR", "Ayşe Yılmaz", "Veri Analizine Giriş")).toMatch(/\+NotoSans-Bold/);
  });

  it("français : toujours les polices standard, sans Noto", async () => {
    const pdf = await renderWith("FR", "Awa Koné", "Excel avancé");
    expect(pdf).toContain("/BaseFont /Helvetica");
    expect(pdf).not.toContain("Noto");
  });
});
