import { Injectable } from "@nestjs/common";
import { enableUnicodeText } from "@shared/pdf/fonts";
import PDFDocument from "pdfkit";
import * as QRCode from "qrcode";


import type { AttestationPdfData, AttestationPdfRendererPort } from "../domain/attestation-pdf-renderer.port";

const TEXTS = {
  fr: {
    title: "Attestation de suivi",
    certifies: "Il est attesté que",
    followed: "a suivi la formation",
    period: "Période",
    from: "du",
    to: "au",
    lastActivity: "Dernière activité le",
    duration: "Durée estimée de la formation",
    progress: "Progression",
    disclaimer: "Cette attestation certifie le suivi de la formation ; elle ne constitue pas un certificat de réussite.",
    issuedOn: "Délivrée le",
    number: "N°",
    verify: "Vérifier",
    locale: "fr-FR",
  },
  en: {
    title: "Attendance Certificate",
    certifies: "This is to certify that",
    followed: "has attended the course",
    period: "Period",
    from: "from",
    to: "to",
    lastActivity: "Last activity on",
    duration: "Estimated course duration",
    progress: "Progress",
    disclaimer: "This document certifies attendance of the course; it is not a certificate of achievement.",
    issuedOn: "Issued on",
    number: "No.",
    verify: "Verify",
    locale: "en-GB",
  },
  ar: {
    title: "شهادة متابعة",
    certifies: "نشهد بأن",
    followed: "قد تابع الدورة التدريبية",
    period: "الفترة",
    from: "من",
    to: "إلى",
    lastActivity: "آخر نشاط بتاريخ",
    duration: "المدة التقديرية للدورة",
    progress: "نسبة التقدم",
    disclaimer: "تشهد هذه الوثيقة بمتابعة الدورة، وهي ليست شهادة نجاح.",
    issuedOn: "صدرت بتاريخ",
    number: "رقم",
    verify: "تحقق",
    locale: "ar-u-nu-latn",
  },
  zh: {
    title: "学习证明",
    certifies: "兹证明",
    followed: "已参加课程",
    period: "学习期间",
    from: "自",
    to: "至",
    lastActivity: "最近学习日期",
    duration: "课程预计时长",
    progress: "学习进度",
    disclaimer: "本证明仅证明已参加课程学习，不构成结业证书。",
    issuedOn: "出具日期",
    number: "编号",
    verify: "验证",
    locale: "zh-CN",
  },
  ru: {
    title: "Справка об обучении",
    certifies: "Настоящим подтверждается, что",
    followed: "проходил(а) курс",
    period: "Период",
    from: "с",
    to: "по",
    lastActivity: "Последняя активность",
    duration: "Ориентировочная длительность курса",
    progress: "Прогресс",
    disclaimer: "Документ подтверждает прохождение курса и не является сертификатом об успешном завершении.",
    issuedOn: "Дата выдачи",
    number: "№",
    verify: "Проверить",
    locale: "ru-RU",
  },
  tr: {
    title: "Katılım Belgesi",
    certifies: "Bu belge ile onaylanır ki",
    followed: "şu eğitime katılmıştır:",
    period: "Dönem",
    from: "başlangıç",
    to: "bitiş",
    lastActivity: "Son etkinlik tarihi",
    duration: "Tahmini eğitim süresi",
    progress: "İlerleme",
    disclaimer: "Bu belge eğitime katılımı belgeler; başarı sertifikası değildir.",
    issuedOn: "Düzenlenme tarihi",
    number: "No",
    verify: "Doğrula",
    locale: "tr-TR",
  },
} as const;

const PRIMARY = "#1e3a5f";
const TEXT = "#222222";
const MUTED = "#666666";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

/**
 * Rendu PDFKit sobre de l'attestation de suivi (ENT-44) : titre, identité, formation, période, durée estimée et
 * progression — jamais de mention de réussite ni de score. Réutilise PDFKit et le QR code des certificats, sans
 * toucher au moteur de design des certificats.
 */
@Injectable()
export class PdfKitAttestationRendererAdapter implements AttestationPdfRendererPort {
  async render(data: AttestationPdfData): Promise<Buffer> {
    const language = data.locale?.toLowerCase().split(/[-_]/)[0] ?? "fr";
    const texts = language in TEXTS ? TEXTS[language as keyof typeof TEXTS] : TEXTS.fr;
    const qr = await QRCode.toDataURL(data.qrVerificationUrl, { margin: 1, width: 180 });

    const doc = enableUnicodeText(new PDFDocument({ size: "A4", layout: "landscape", margins: { top: 50, left: 50, right: 50, bottom: 0 } }));
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const { width, height } = doc.page;
    const side = 60;
    const contentWidth = width - side * 2;
    const options = { width: contentWidth, align: "center" as const };
    const date = (value: Date) => value.toLocaleDateString(texts.locale);

    doc.rect(0, 0, width, 20).fill(PRIMARY);
    doc.lineWidth(2).strokeColor(PRIMARY).rect(30, 30, width - 60, height - 60).stroke();

    doc.fillColor(TEXT).fontSize(28).font("Helvetica-Bold").text(texts.title, side, 90, options);
    doc.moveDown(1);
    doc.fontSize(14).font("Helvetica").text(texts.certifies, side, doc.y, options);
    doc.fontSize(24).font("Helvetica-Bold").fillColor(PRIMARY).text(data.learnerName, side, doc.y, options);
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica").fillColor(TEXT).text(texts.followed, side, doc.y, options);
    doc.fontSize(18).font("Helvetica-Bold").text(data.courseTitle, side, doc.y, options);

    doc.moveDown(0.8).fontSize(12).font("Helvetica").fillColor(TEXT);
    if (data.startedAt && data.endedAt) {
      doc.text(
        `${texts.period} : ${texts.from} ${date(data.startedAt)} ${texts.to} ${date(data.endedAt)}`,
        side,
        doc.y,
        options,
      );
    } else if (data.endedAt) {
      doc.text(`${texts.lastActivity} ${date(data.endedAt)}`, side, doc.y, options);
    }
    if (data.durationMinutes) {
      doc.moveDown(0.3).text(`${texts.duration} : ${formatDuration(data.durationMinutes)}`, side, doc.y, options);
    }
    doc.moveDown(0.3).text(`${texts.progress} : ${data.progressPercent}%`, side, doc.y, options);

    doc.moveDown(1).fontSize(9).fillColor(MUTED).text(texts.disclaimer, side, doc.y, options);
    doc
      .moveDown(0.6)
      .fontSize(10)
      .text(`${texts.issuedOn} ${date(data.issuedAt)} — ${texts.number} ${data.number}`, side, doc.y, options);

    const qrBuffer = Buffer.from(qr.split(",")[1] ?? "", "base64");
    doc.image(qrBuffer, width - 160, height - 160, { width: 100, height: 100 });
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(texts.verify, width - 160, height - 55, { width: 100, align: "center", lineBreak: false });

    doc.end();
    return finished;
  }
}
