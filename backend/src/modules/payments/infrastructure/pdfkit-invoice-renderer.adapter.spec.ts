import { PdfKitInvoiceRendererAdapter } from "./pdfkit-invoice-renderer.adapter";

describe("PdfKitInvoiceRendererAdapter", () => {
  it("produit un document PDF non vide", async () => {
    const buffer = await new PdfKitInvoiceRendererAdapter().render({
      customerName: "Acme Formation",
      customerEmail: null,
      invoice: {
        paymentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        number: "FAC-202611-A1B2C3D4",
        type: "SUBSCRIPTION",
        method: "WAVE",
        status: "SUCCEEDED",
        description: "Abonnement Pro (mensuel)",
        amount: 25000,
        currency: "XOF",
        issuedAt: new Date("2026-11-17T08:00:00Z"),
      },
    });

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });
});
