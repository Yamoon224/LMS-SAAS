import { Injectable } from "@nestjs/common";
import { enableUnicodeText } from "@shared/pdf/fonts";
import PDFDocument from "pdfkit";


import type { PayoutStatementData } from "../domain/payout-statement";
import type { PayoutStatementRendererPort } from "../domain/payout-statement-renderer.port";
import type { SalesBreakdown } from "../domain/sales-breakdown";

const DESTINATION_LABELS = { BANK: "Compte bancaire", MOBILE_MONEY: "Mobile Money" } as const;

const formatDate = (date: Date | null): string => (date ? date.toLocaleDateString("fr-FR") : "—");

/** Relevé de reversement A4 avec PDFKit (même choix que les factures et certificats). */
@Injectable()
export class PdfKitPayoutStatementRendererAdapter implements PayoutStatementRendererPort {
  async render(data: PayoutStatementData): Promise<Buffer> {
    const doc = enableUnicodeText(new PDFDocument({ size: "A4", margin: 50 }));
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    doc.fontSize(22).font("Helvetica-Bold").text("RELEVÉ DE REVERSEMENT", { align: "right" });
    doc.fontSize(11).font("Helvetica").fillColor("#475569").text(data.number, { align: "right" });

    doc.moveDown(2).fillColor("#111827").font("Helvetica-Bold").text("Bénéficiaire");
    doc.font("Helvetica").text(data.tenantName);

    const rows: [string, string][] = [
      ["Montant reversé", `${data.amount.toLocaleString("fr-FR")} ${data.currency}`],
      ["Demandé le", formatDate(data.requestedAt)],
      ["Exécuté le", formatDate(data.executedAt)],
      ["Destination", DESTINATION_LABELS[data.destinationType]],
      ["Titulaire du compte", data.accountName],
      ["Numéro de compte", data.accountNumberMasked],
    ];
    doc.moveDown(1.5);
    for (const [label, value] of rows) {
      const y = doc.y;
      doc.font("Helvetica-Bold").text(label, 50, y, { width: 200 });
      doc.font("Helvetica").text(value, 260, y, { width: 285 });
      doc.moveDown(0.6);
    }

    if (data.breakdown) this.renderBreakdown(doc, data.breakdown, data.currency);

    doc.end();
    return finished;
  }

  /** Étape 30 : ventilation brut / commission / frais / net des ventes couvertes par ce reversement. */
  private renderBreakdown(doc: PDFKit.PDFDocument, breakdown: SalesBreakdown, currency: string): void {
    const money = (value: number): string => `${value.toLocaleString("fr-FR")} ${currency}`;
    const rows: [string, string][] = [
      [`Ventes de la période (${breakdown.salesCount})`, money(breakdown.gross)],
      ["Commission de la plateforme", `- ${money(breakdown.commission)}`],
      ["Frais du fournisseur de paiement (à votre charge)", `- ${money(breakdown.feeChargedToTenant)}`],
    ];
    if (breakdown.unallocated > 0) {
      rows.push(["Commission et frais non ventilés (anciennes ventes)", `- ${money(breakdown.unallocated)}`]);
    }
    rows.push(["Net des ventes", money(breakdown.net)]);
    if (breakdown.deductions > 0) {
      rows.push(["Remboursements et commissions hors plateforme repris", `- ${money(breakdown.deductions)}`]);
    }

    doc.moveDown(1.5).font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Détail des ventes couvertes");
    doc.fontSize(11).moveDown(0.6);
    for (const [label, value] of rows) {
      const y = doc.y;
      doc.font("Helvetica").text(label, 50, y, { width: 330 });
      doc.font("Helvetica-Bold").text(value, 390, y, { width: 155, align: "right" });
      doc.moveDown(0.5);
    }
    doc
      .moveDown(0.8)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#475569")
      .text("Le montant reversé est le solde disponible à la date de la demande (il tient compte des ajustements antérieurs).", 50);
  }
}
