import type { CertificateDesign } from "../domain/certificate-design";

import { PdfKitCertificateRendererAdapter } from "./pdfkit-certificate-renderer.adapter";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

class StubRenderer extends PdfKitCertificateRendererAdapter {
  protected override loadImage(url: string): Promise<Buffer | null> {
    if (url.endsWith("logo.png")) return Promise.resolve(PNG_1X1);
    return Promise.resolve(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])); // corrompue
  }
}

async function render(design: CertificateDesign, renderer = new PdfKitCertificateRendererAdapter()): Promise<string> {
  const buffer = await renderer.render({
    learnerName: "Awa Kone",
    courseTitle: "Excel avancé",
    number: "CERT-2026-0001",
    issuedAt: new Date("2026-11-17T00:00:00Z"),
    scorePercent: 92,
    durationMinutes: 150,
    qrVerificationUrl: "https://exemple.test/verify/CERT-2026-0001",
    design,
  });
  expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  return buffer.toString("latin1");
}

describe("PdfKitCertificateRendererAdapter — options enrichies", () => {
  it("produit un PDF Letter", async () => {
    expect(await render({ pageFormat: "LETTER" })).toMatch(/\/MediaBox \[0 0 792 612\]/);
  });

  it("n'écrit qu'une page avec tous les éléments activés", async () => {
    const pdf = await render({
      borderStyle: "ORNATE",
      borderColor: "#112233",
      backgroundColor: "#f5f5f5",
      watermarkType: "TEXT",
      watermarkText: "ORIGINAL",
      title: "Attestation",
      bodyText: "{{learnerName}} a suivi {{courseTitle}} le {{date}} ({{score}}) - {{certificateNumber}}.",
      footerText: "Organisme de formation n° 123",
      language: "EN",
      showDuration: true,
      signatories: [
        { name: "Awa Koné", title: "Directrice" },
        { name: "Paul Martin", title: "Formateur" },
      ],
    });
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(1);
  });

  it("omet les images distantes interdites sans échouer", async () => {
    await expect(
      render({ logoUrl: "http://127.0.0.1/logo.png", backgroundUrl: "http://169.254.169.254/x.png", watermarkType: "LOGO" }),
    ).resolves.toBeTruthy();
  });

  it("dessine une image valide et ignore une image corrompue", async () => {
    const pdf = await render(
      {
        showQrCode: false,
        logoUrl: "https://exemple.test/logo.png",
        signatories: [{ name: "X", imageUrl: "https://exemple.test/sig.png" }],
      },
      new StubRenderer(),
    );
    expect(pdf).toContain("/Subtype /Image");
  });

  it("masque le QR code quand showQrCode est faux", async () => {
    expect(await render({})).toContain("/Subtype /Image");
    expect(await render({ showQrCode: false })).not.toContain("/Subtype /Image");
  });
});
