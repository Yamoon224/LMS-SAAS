import { Injectable } from "@nestjs/common";
import { enableUnicodeText } from "@shared/pdf/fonts";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";


import { CERTIFICATE_TEXTS, PDF_FONTS, renderTemplateText, resolveDesign } from "../domain/certificate-design";
import type { ResolvedDesign, TextVariable } from "../domain/certificate-design";
import type { CertificatePdfData, CertificatePdfRendererPort } from "../domain/certificate-pdf-renderer.port";

import { fetchImageSafely } from "./safe-image-fetcher";

/** Retrait des bordures par rapport au bord de la page, en points PDF. */
const BORDER_INSET = 30;
const DOUBLE_BORDER_GAP = 8;
const SIDE_MARGIN = 60;
const LOGO_HEIGHTS = { SMALL: 40, MEDIUM: 60, LARGE: 90 } as const;

function drawBorder(doc: PDFKit.PDFDocument, design: ResolvedDesign): void {
  if (design.borderStyle === "NONE") return;
  const frame = (inset: number, width: number) =>
    doc
      .lineWidth(width)
      .strokeColor(design.borderColor)
      .rect(inset, inset, doc.page.width - inset * 2, doc.page.height - inset * 2)
      .stroke();
  if (design.borderStyle === "ORNATE") {
    frame(BORDER_INSET, 3);
    frame(BORDER_INSET + DOUBLE_BORDER_GAP, 1);
    const inner = BORDER_INSET + DOUBLE_BORDER_GAP;
    const size = 12;
    for (const x of [inner, doc.page.width - inner - size]) {
      for (const y of [inner, doc.page.height - inner - size]) {
        doc.rect(x, y, size, size).fill(design.borderColor);
      }
    }
    return;
  }
  frame(BORDER_INSET, 2);
  if (design.borderStyle === "DOUBLE") frame(BORDER_INSET + DOUBLE_BORDER_GAP, 1);
}

/** Dessine une image sans jamais faire échouer le certificat : une image illisible est simplement omise. */
function drawImage(doc: PDFKit.PDFDocument, buffer: Buffer | null | undefined, x: number, y: number, options: PDFKit.Mixins.ImageOption): void {
  if (!buffer) return;
  try {
    doc.image(buffer, x, y, options);
  } catch {
    // image corrompue : on l'ignore
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

/**
 * Adaptateur de génération du PDF (section 12.4). PDFKit plutôt qu'un
 * navigateur headless (Puppeteer) : pas de dépendance binaire externe, mise
 * en page simple (une page, titre, texte, score, signataires, QR code).
 *
 * Le design du modèle est appliqué : format et orientation, police (Helvetica, Times, Courier — intégrées à tout
 * lecteur PDF), couleurs, bordure, fond (couleur ou image + opacité), logo (position, taille), filigrane, titre et
 * texte d'attestation personnalisés, éléments affichés, signataires, insigne, pied de page, langue.
 * Toute valeur passe par `resolveDesign` : jamais de valeur libre transmise à PDFKit. Les images distantes
 * (http/https, PNG ou JPEG) sont téléchargées via `fetchImageSafely` (anti-SSRF, taille et délai bornés) ; en cas
 * d'échec elles sont omises. Les polices standard ne couvrent pas les alphabets arabe, chinois ou cyrillique : `enableUnicodeText`
 * (shared/pdf/fonts) bascule alors, chaîne par chaîne, sur les polices Noto embarquées (arabe : mise en forme
 * contextuelle et sens RTL) ; le latin reste en police standard.
 */
@Injectable()
export class PdfKitCertificateRendererAdapter implements CertificatePdfRendererPort {
  protected loadImage(url: string): Promise<Buffer | null> {
    return fetchImageSafely(url);
  }

  async render(data: CertificatePdfData): Promise<Buffer> {
    const design = resolveDesign(data.design);
    const fonts = PDF_FONTS[design.fontFamily];
    const texts = CERTIFICATE_TEXTS[design.language];

    const urls = [
      ...new Set(
        [design.logoUrl, design.badgeUrl, design.backgroundUrl, ...design.signatories.map((s) => s.imageUrl)].filter(
          (url): url is string => Boolean(url),
        ),
      ),
    ];
    const [qrCodeDataUrl, loaded] = await Promise.all([
      design.showQrCode ? QRCode.toDataURL(data.qrVerificationUrl, { margin: 1, width: 180 }) : Promise.resolve(null),
      Promise.all(urls.map(async (url) => [url, await this.loadImage(url)] as const)),
    ]);
    const images = new Map(loaded);
    const image = (url: string | undefined) => (url ? images.get(url) : undefined);

    const doc = enableUnicodeText(
      new PDFDocument({
        size: design.pageFormat,
        layout: design.orientation.toLowerCase() as "landscape" | "portrait",
        margins: { top: 50, left: 50, right: 50, bottom: 0 },
      }),
    );
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const { width, height } = doc.page;
    const contentWidth = width - SIDE_MARGIN * 2;
    const logo = image(design.logoUrl);

    // Fond
    if (design.backgroundColor.toLowerCase() !== "#ffffff") doc.rect(0, 0, width, height).fill(design.backgroundColor);
    const background = image(design.backgroundUrl);
    if (background) {
      doc.save();
      doc.opacity(design.backgroundOpacity);
      drawImage(doc, background, 0, 0, { cover: [width, height] });
      doc.restore();
    }

    // Filigrane
    if (design.watermarkType === "TEXT" && design.watermarkText) {
      doc.save();
      doc.opacity(design.watermarkOpacity);
      doc.font(fonts.bold).fillColor(design.secondaryColor);
      const measured = doc.fontSize(100).widthOfString(design.watermarkText);
      const size = Math.max(12, Math.min(100, (100 * width * 0.8) / Math.max(measured, 1)));
      doc.fontSize(size);
      doc.rotate(-30, { origin: [width / 2, height / 2] });
      doc.text(design.watermarkText, width / 2 - doc.widthOfString(design.watermarkText) / 2, height / 2 - size / 2, {
        lineBreak: false,
      });
      doc.restore();
    } else if (design.watermarkType === "LOGO") {
      doc.save();
      doc.opacity(design.watermarkOpacity);
      drawImage(doc, logo, width * 0.25, height * 0.25, { fit: [width * 0.5, height * 0.5], align: "center", valign: "center" });
      doc.restore();
    }

    doc.rect(0, 0, width, 20).fill(design.primaryColor);
    drawBorder(doc, design);

    // Logo
    let contentTop = 100;
    if (logo) {
      const logoHeight = LOGO_HEIGHTS[design.logoSize];
      drawImage(doc, logo, SIDE_MARGIN, 40, {
        fit: [contentWidth, logoHeight],
        align: design.logoPosition === "LEFT" ? undefined : (design.logoPosition.toLowerCase() as "center" | "right"),
      });
      contentTop = Math.max(contentTop, 40 + logoHeight + 15);
    }

    // Textes
    const dateText = data.issuedAt.toLocaleDateString(texts.locale);
    const scoreText = data.scorePercent !== null ? `${data.scorePercent}%` : "";
    const values: Record<TextVariable, string> = {
      learnerName: data.learnerName,
      courseTitle: data.courseTitle,
      date: dateText,
      score: scoreText,
      certificateNumber: data.number,
    };
    const textOptions = { width: contentWidth, align: "center" as const };

    doc.fillColor(design.textColor);
    doc.fontSize(28).font(fonts.bold).text(renderTemplateText(design.title ?? texts.title, values), SIDE_MARGIN, contentTop, textOptions);

    if (design.bodyText) {
      doc.moveDown(0.8);
      doc.fontSize(14).font(fonts.regular).text(renderTemplateText(design.bodyText, values), SIDE_MARGIN, doc.y, textOptions);
    } else {
      doc.fontSize(14).font(fonts.regular).text(texts.awardedTo, SIDE_MARGIN, doc.y, textOptions);
      doc.fontSize(24).font(fonts.bold).fillColor(design.primaryColor).text(data.learnerName, SIDE_MARGIN, doc.y, textOptions);
      doc.moveDown(0.5);
      doc.fontSize(14).font(fonts.regular).fillColor(design.textColor).text(texts.completed, SIDE_MARGIN, doc.y, textOptions);
      doc.fontSize(18).font(fonts.bold).text(data.courseTitle, SIDE_MARGIN, doc.y, textOptions);
    }

    const scoreAlreadyInBody = design.bodyText?.includes("{{score}}") ?? false;
    if (design.showScore && data.scorePercent !== null && !scoreAlreadyInBody) {
      doc.moveDown(0.5);
      doc.fontSize(12).font(fonts.regular).fillColor(design.textColor).text(`${texts.score} : ${scoreText}`, SIDE_MARGIN, doc.y, textOptions);
    }
    if (design.showDuration && data.durationMinutes) {
      doc.moveDown(0.3);
      doc
        .fontSize(12)
        .font(fonts.regular)
        .fillColor(design.textColor)
        .text(`${texts.duration} : ${formatDuration(data.durationMinutes)}`, SIDE_MARGIN, doc.y, textOptions);
    }

    const metaParts: string[] = [];
    if (design.showDate) metaParts.push(`${texts.issuedOn} ${dateText}`);
    if (design.showNumber) metaParts.push(`${texts.number} ${data.number}`);
    if (metaParts.length > 0) {
      doc.moveDown(1);
      doc.fontSize(10).font(fonts.regular).fillColor(design.secondaryColor).text(metaParts.join(" — "), SIDE_MARGIN, doc.y, textOptions);
    }

    // Insigne (bas gauche)
    drawImage(doc, image(design.badgeUrl), SIDE_MARGIN, height - 160, { fit: [90, 90] });

    // Signataires (zone centrale du bas, entre insigne et QR code)
    const zoneLeft = SIDE_MARGIN + 110;
    const zoneWidth = width - zoneLeft - 180;
    const columnWidth = zoneWidth / Math.max(design.signatories.length, 1);
    const lineY = height - 125;
    design.signatories.forEach((signatory, index) => {
      const columnX = zoneLeft + columnWidth * index;
      const boxWidth = Math.min(columnWidth - 20, 170);
      const boxX = columnX + (columnWidth - boxWidth) / 2;
      drawImage(doc, image(signatory.imageUrl), boxX, lineY - 50, { fit: [boxWidth, 45], align: "center", valign: "bottom" });
      doc.lineWidth(0.8).strokeColor(design.secondaryColor).moveTo(boxX, lineY).lineTo(boxX + boxWidth, lineY).stroke();
      doc.fontSize(10).font(fonts.bold).fillColor(design.textColor).text(signatory.name, boxX, lineY + 4, { width: boxWidth, align: "center", lineBreak: false });
      if (signatory.title) {
        doc.fontSize(9).font(fonts.regular).fillColor(design.secondaryColor).text(signatory.title, boxX, lineY + 17, { width: boxWidth, align: "center", lineBreak: false });
      }
    });

    // QR code de vérification
    if (qrCodeDataUrl) {
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(",")[1] ?? "", "base64");
      doc.image(qrCodeBuffer, width - 160, height - 160, { width: 100, height: 100 });
      doc.fontSize(8).font(fonts.regular).fillColor(design.secondaryColor).text(texts.verify, width - 160, height - 55, { width: 100, align: "center", lineBreak: false });
    }

    // Pied de page
    if (design.footerText) {
      doc.fontSize(9).font(fonts.regular).fillColor(design.secondaryColor).text(renderTemplateText(design.footerText, values), SIDE_MARGIN, height - 42, {
        width: width - SIDE_MARGIN - 180,
        height: 24,
        align: "center",
        ellipsis: true,
      });
    }

    doc.end();
    return finished;
  }
}
