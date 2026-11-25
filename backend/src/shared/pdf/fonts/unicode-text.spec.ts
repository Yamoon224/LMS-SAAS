import PDFDocument from "pdfkit";

import { enableUnicodeText } from "./unicode-text";

async function generate(draw: (doc: PDFKit.PDFDocument) => void): Promise<string> {
  const doc = enableUnicodeText(new PDFDocument({ size: "A4", margins: { top: 40, left: 40, right: 40, bottom: 0 } }));
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  draw(doc);
  doc.end();
  const buffer = await finished;
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  return buffer.toString("latin1");
}

describe("enableUnicodeText", () => {
  it("embarque Noto Sans Arabic pour un texte arabe (latin et nombres mêlés), sans erreur", async () => {
    const pdf = await generate((doc) => {
      doc.font("Helvetica-Bold").fontSize(24).text("شهادة نجاح", 40, 60, { width: 500, align: "center" });
      doc
        .font("Helvetica")
        .fontSize(14)
        .text("مرحبا بكم في المنصة التعليمية لهذا العام الدراسي الجديد 2026 — Entreprise Démo (ABC)", 40, 120, { width: 300 });
    });
    expect(pdf).toMatch(/\/FontName \/[A-Z]+\+NotoSansArabic-Bold/);
    expect(pdf).toMatch(/\/FontName \/[A-Z]+\+NotoSansArabic-Regular/);
  });

  it("embarque Noto Sans SC pour le chinois", async () => {
    const pdf = await generate((doc) => {
      doc.font("Helvetica").fontSize(18).text("结业证书 — 张伟完成课程《数据分析入门》", 40, 60, { width: 500, align: "center" });
    });
    expect(pdf).toMatch(/\/FontName \/[A-Z]+\+NotoSansSC-Regular/);
  });

  it("embarque Noto Sans pour le russe et le turc", async () => {
    const pdf = await generate((doc) => {
      doc.font("Helvetica").text("Сертификат об окончании курса", 40, 60);
      doc.text("İstanbul — ğ ş ı", 40, 90);
    });
    expect(pdf).toMatch(/\/FontName \/[A-Z]+\+NotoSans-Regular/);
  });

  it("n'embarque aucune police Noto pour du latin : les polices standard restent le défaut", async () => {
    const pdf = await generate((doc) => {
      doc.font("Helvetica-Bold").text("Certificat de réussite — Awa Koné", 40, 60, { width: 400, align: "center" });
    });
    expect(pdf).not.toContain("Noto");
    expect(pdf).toContain("/BaseFont /Helvetica-Bold");
  });

  it("restaure la police standard après un texte non latin et met à jour doc.y", async () => {
    let before = 0;
    let after = 0;
    await generate((doc) => {
      doc.font("Helvetica").fontSize(14).text("شهادة نجاح", 40, 60, { width: 400 });
      before = doc.y;
      doc.text("Awa Koné", 40, doc.y, { width: 400 });
      after = doc.y;
      expect((doc as unknown as { _font: { name: string } })._font.name).toBe("Helvetica");
    });
    expect(before).toBeGreaterThan(60);
    expect(after).toBeGreaterThan(before);
  });

  it("mesure et coupe les lignes arabes (largeur, hauteur, ellipse)", async () => {
    await generate((doc) => {
      doc.font("Helvetica").fontSize(14);
      const long = "مرحبا بكم في المنصة التعليمية لهذا العام الدراسي الجديد ".repeat(3);
      expect(doc.widthOfString("شهادة")).toBeGreaterThan(10);
      expect(doc.heightOfString(long, { width: 200 })).toBeGreaterThan(doc.heightOfString("شهادة", { width: 200 }) * 2);
      doc.text(long, 40, 60, { width: 120, lineBreak: false, ellipsis: true });
      doc.text(long, 40, 100, { width: 200, align: "right" });
    });
  });
});
