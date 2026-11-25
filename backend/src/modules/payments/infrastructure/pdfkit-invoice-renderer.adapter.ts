import { Injectable } from "@nestjs/common";
import { enableUnicodeText } from "@shared/pdf/fonts";
import PDFDocument from "pdfkit";


import type { InvoicePdfData, InvoicePdfRendererPort } from "../domain/invoice-pdf-renderer.port";

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: "Payée",
  REFUNDED: "Remboursée",
  PARTIALLY_REFUNDED: "Partiellement remboursée",
};

const METHOD_LABELS: Record<string, string> = {
  CARD: "Carte bancaire",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  WAVE: "Wave",
  OTHER: "Autre",
};

/** Génère une facture A4 simple avec PDFKit (même choix que les certificats : pas de navigateur headless). */
@Injectable()
export class PdfKitInvoiceRendererAdapter implements InvoicePdfRendererPort {
  async render({ invoice, customerName, customerEmail }: InvoicePdfData): Promise<Buffer> {
    const doc = enableUnicodeText(new PDFDocument({ size: "A4", margin: 50 }));
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const amount = `${invoice.amount.toLocaleString("fr-FR")} ${invoice.currency}`;

    doc.fontSize(24).font("Helvetica-Bold").text("FACTURE", { align: "right" });
    doc.fontSize(11).font("Helvetica").fillColor("#475569").text(invoice.number, { align: "right" });
    doc.text(`Émise le ${invoice.issuedAt.toLocaleDateString("fr-FR")}`, { align: "right" });

    doc.moveDown(2).fillColor("#111827").font("Helvetica-Bold").text("Facturé à");
    doc.font("Helvetica").text(customerName);
    if (customerEmail) doc.text(customerEmail);

    doc.moveDown(2);
    const top = doc.y;
    doc.font("Helvetica-Bold").text("Description", 50, top).text("Montant", 400, top, { width: 145, align: "right" });
    doc.moveTo(50, top + 18).lineTo(545, top + 18).strokeColor("#cbd5e1").stroke();
    doc.font("Helvetica").text(invoice.description, 50, top + 28, { width: 330 });
    doc.text(amount, 400, top + 28, { width: 145, align: "right" });

    doc.moveDown(4).font("Helvetica-Bold").text(`Total : ${amount}`, { align: "right" });
    doc.font("Helvetica").fillColor("#475569");
    doc.text(`Statut : ${STATUS_LABELS[invoice.status] ?? invoice.status}`, { align: "right" });
    doc.text(`Moyen de paiement : ${METHOD_LABELS[invoice.method] ?? invoice.method}`, { align: "right" });

    doc.end();
    return finished;
  }
}
