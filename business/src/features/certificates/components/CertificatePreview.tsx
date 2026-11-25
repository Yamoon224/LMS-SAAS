import type { CSSProperties } from "react";

import { isHttpUrl } from "../schemas/certificate-design-form";
import type { DesignFormValues } from "../schemas/certificate-design-form";

/** Aperçu rapide (HTML/CSS) : approximation du PDF réel, avec des données fictives. Ce fichier est identique côté admin et business. */
const HEX = /^#[0-9a-fA-F]{6}$/;
const FONT_STACKS = {
  HELVETICA: "Helvetica, Arial, sans-serif",
  TIMES: '"Times New Roman", Times, serif',
  COURIER: '"Courier New", Courier, monospace',
} as const;
const TEXTS = {
  FR: { title: "Certificat de réussite", awardedTo: "décerné à", completed: "pour avoir complété la formation", score: "Score obtenu", issuedOn: "Délivré le", number: "N°", duration: "Durée de la formation", verify: "Vérifier", date: "15/01/2026" },
  EN: { title: "Certificate of Achievement", awardedTo: "awarded to", completed: "for successfully completing the course", score: "Score", issuedOn: "Issued on", number: "No.", duration: "Course duration", verify: "Verify", date: "15/01/2026" },
  AR: { title: "شهادة نجاح", awardedTo: "تُمنح إلى", completed: "لإتمامه الدورة التدريبية", score: "النتيجة", issuedOn: "صدرت بتاريخ", number: "رقم", duration: "مدة الدورة", verify: "تحقق", date: "15/01/2026" },
  ZH: { title: "结业证书", awardedTo: "兹授予", completed: "已顺利完成课程", score: "成绩", issuedOn: "颁发日期", number: "编号", duration: "课程时长", verify: "验证", date: "2026/01/15" },
  RU: { title: "Сертификат об окончании курса", awardedTo: "выдан", completed: "за успешное прохождение курса", score: "Результат", issuedOn: "Дата выдачи", number: "№", duration: "Длительность курса", verify: "Проверить", date: "15.01.2026" },
  TR: { title: "Başarı Sertifikası", awardedTo: "adına düzenlenmiştir:", completed: "eğitimi başarıyla tamamladığı için", score: "Puan", issuedOn: "Düzenlenme tarihi", number: "No", duration: "Eğitim süresi", verify: "Doğrula", date: "15.01.2026" },
} as const;
const SAMPLE = { learnerName: "Prénom Nom", courseTitle: "Intitulé de la formation", score: "92%", certificateNumber: "CERT-EXEMPLE-0001" };
const LOGO_HEIGHT = { SMALL: 7, MEDIUM: 11, LARGE: 16 } as const;

function color(value: string, fallback: string): string {
  return HEX.test(value) ? value : fallback;
}
function safeUrl(value: string): string | null {
  return value && isHttpUrl(value.trim()) ? value.trim() : null;
}
function fill(text: string, date: string): string {
  return text.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (match, name: string) => {
    if (name === "date") return date;
    return name in SAMPLE ? SAMPLE[name as keyof typeof SAMPLE] : match;
  });
}

export function CertificatePreview({ values }: { values: DesignFormValues }) {
  const t = TEXTS[values.language];
  const primary = color(values.primaryColor, "#1e3a8a");
  const text = color(values.textColor, "#111827");
  const secondary = color(values.secondaryColor, "#6b7280");
  const border = color(values.borderColor, primary);
  const background = color(values.backgroundColor, "#ffffff");
  const landscape = values.orientation === "LANDSCAPE";
  const ratio = values.pageFormat === "A4" ? 297 / 210 : 11 / 8.5;
  const logo = safeUrl(values.logoUrl);
  const bgImage = safeUrl(values.backgroundUrl);
  const badge = safeUrl(values.badgeUrl);
  const signatories = [
    { name: values.signatory1Name, title: values.signatory1Title, image: safeUrl(values.signatory1ImageUrl) },
    { name: values.signatory2Name, title: values.signatory2Title, image: safeUrl(values.signatory2ImageUrl) },
  ].filter((s) => s.name.trim() !== "");

  const frame = (inset: number, width: number): CSSProperties => ({
    position: "absolute",
    inset: `${inset}cqw`,
    border: `${width}cqw solid ${border}`,
    pointerEvents: "none",
  });
  const unit = (n: number) => `${n}cqw`;
  const logoAlign = { LEFT: "flex-start", CENTER: "center", RIGHT: "flex-end" }[values.logoPosition];
  const meta = [values.showDate ? `${t.issuedOn} ${t.date}` : "", values.showNumber ? `${t.number} ${SAMPLE.certificateNumber}` : ""].filter(Boolean).join(" — ");

  return (
    <div
      role="img"
      aria-label="Aperçu rapide du certificat"
      className="w-full overflow-hidden rounded border border-border shadow-sm"
      style={{
        containerType: "inline-size",
        aspectRatio: landscape ? `${ratio}` : `${1 / ratio}`,
        position: "relative",
        background,
        color: text,
        fontFamily: FONT_STACKS[values.fontFamily],
      }}
    >
      {bgImage && (
        <img src={bgImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: values.backgroundOpacity }} />
      )}
      {values.watermarkType === "TEXT" && values.watermarkText && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-30deg)", opacity: values.watermarkOpacity, color: secondary, fontWeight: 700, fontSize: unit(landscape ? 12 : 14), whiteSpace: "nowrap", overflow: "hidden" }}>
          {values.watermarkText}
        </div>
      )}
      {values.watermarkType === "LOGO" && logo && (
        <img src={logo} alt="" style={{ position: "absolute", inset: "25%", width: "50%", height: "50%", objectFit: "contain", opacity: values.watermarkOpacity }} />
      )}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: unit(1.2), background: primary }} />
      {values.borderStyle !== "NONE" && <div style={frame(3.5, values.borderStyle === "ORNATE" ? 0.35 : 0.25)} />}
      {(values.borderStyle === "DOUBLE" || values.borderStyle === "ORNATE") && <div style={frame(4.5, 0.12)} />}

      <div style={{ position: "absolute", inset: `${unit(5)} ${unit(7)}`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {logo && (
          <div style={{ width: "100%", display: "flex", justifyContent: logoAlign, marginBottom: unit(1.5) }}>
            
            <img src={logo} alt="" style={{ height: unit(LOGO_HEIGHT[values.logoSize]), maxWidth: "60%", objectFit: "contain" }} />
          </div>
        )}
        <div style={{ fontSize: unit(3.4), fontWeight: 700, marginTop: unit(logo ? 0 : 3) }}>{fill(values.title || t.title, t.date)}</div>
        {values.bodyText ? (
          <div style={{ fontSize: unit(1.7), marginTop: unit(2), whiteSpace: "pre-wrap" }}>{fill(values.bodyText, t.date)}</div>
        ) : (
          <>
            <div style={{ fontSize: unit(1.7), marginTop: unit(2) }}>{t.awardedTo}</div>
            <div style={{ fontSize: unit(2.9), fontWeight: 700, color: primary }}>{SAMPLE.learnerName}</div>
            <div style={{ fontSize: unit(1.7), marginTop: unit(1) }}>{t.completed}</div>
            <div style={{ fontSize: unit(2.2), fontWeight: 700 }}>{SAMPLE.courseTitle}</div>
          </>
        )}
        {values.showScore && !values.bodyText.includes("{{score}}") && <div style={{ fontSize: unit(1.4), marginTop: unit(1) }}>{t.score} : {SAMPLE.score}</div>}
        {values.showDuration && <div style={{ fontSize: unit(1.4), marginTop: unit(0.5) }}>{t.duration} : 2 h 30</div>}
        {meta && <div style={{ fontSize: unit(1.2), marginTop: unit(2), color: secondary }}>{meta}</div>}
      </div>

      <div style={{ position: "absolute", left: unit(7), right: unit(7), bottom: unit(5), display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: unit(2) }}>
        <div style={{ width: unit(9), height: unit(9) }}>
          {badge && (
            <img src={badge} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-around", gap: unit(2) }}>
          {signatories.map((s, index) => (
            <div key={index} style={{ width: unit(17), textAlign: "center" }}>
              <div style={{ height: unit(4.5), display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {s.image && (
                  <img src={s.image} alt="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                )}
              </div>
              <div style={{ borderTop: `1px solid ${secondary}`, fontSize: unit(1.1), fontWeight: 700 }}>{s.name}</div>
              {s.title && <div style={{ fontSize: unit(1), color: secondary }}>{s.title}</div>}
            </div>
          ))}
        </div>
        {values.showQrCode && (
          <div style={{ width: unit(9), textAlign: "center", fontSize: unit(0.9), color: secondary }}>
            <div style={{ width: unit(9), height: unit(9), background: `repeating-conic-gradient(${text} 0% 25%, ${background} 0% 50%) 50% / ${unit(1.8)} ${unit(1.8)}` }} />
            {t.verify}
          </div>
        )}
      </div>
      {values.footerText && (
        <div style={{ position: "absolute", left: unit(7), right: unit(20), bottom: unit(1.6), textAlign: "center", fontSize: unit(1), color: secondary }}>
          {fill(values.footerText, t.date)}
        </div>
      )}
    </div>
  );
}
