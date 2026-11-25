/**
 * PUB-13 : constructeur pur d'un fichier iCalendar (RFC 5545) pour une session live.
 * Aucune dépendance : échappement du texte (§3.3.11), lignes pliées à 75 octets (§3.1), fins de ligne CRLF.
 * Tout texte saisi (titre, description) passe par `escapeIcsText` : un retour à la ligne devient la
 * séquence littérale `\n`, donc impossible d'injecter une propriété ou un en-tête.
 */

export interface IcsEvent {
  /** Identifiant stable de l'événement : le même fichier téléchargé deux fois met à jour le même événement. */
  uid: string;
  title: string;
  startAt: Date;
  durationMinutes: number;
  description?: string | null;
  /** Lien de connexion : exposé comme LOCATION et URL s'il est en http(s). */
  url?: string | null;
  /** Date de génération (DTSTAMP) ; injectable pour des tests déterministes. */
  now?: Date;
  /** Rappel avant le début, en minutes (15 par défaut ; 0 = pas de rappel). */
  reminderMinutes?: number;
  /** Fuseau IANA de la session (ex. Africa/Abidjan) : exposé en X-WR-TIMEZONE pour l'affichage ; les heures restent en UTC. */
  timezone?: string | null;
  /** Texte du rappel. */
  reminderText?: string;
}

const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

/** Vrai pour un caractère de contrôle (hors saut de ligne) ou un séparateur de ligne Unicode. */
function isControl(code: number): boolean {
  return (code < 32 && code !== 10) || code === 127 || code === 0x2028 || code === 0x2029;
}

function stripControl(value: string): string {
  let out = "";
  for (const char of value) {
    if (!isControl(char.codePointAt(0) ?? 0)) out += char;
  }
  return out;
}

/** Échappe une valeur TEXT : `\`, `;`, `,` et retours à la ligne ; supprime les autres caractères de contrôle. */
export function escapeIcsText(value: string): string {
  return stripControl(value.replace(/\r\n|\r|\n/g, "\n"))
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Date UTC au format `YYYYMMDDTHHMMSSZ`. */
export function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Plie une ligne de contenu à 75 octets UTF-8 sans couper un caractère multi-octets. */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= MAX_LINE_OCTETS) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = MAX_LINE_OCTETS;
  for (const char of line) {
    const bytes = Buffer.byteLength(char, "utf8");
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = MAX_LINE_OCTETS - 1; // l'espace de continuation compte dans la limite
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/\s/.test(value) || stripControl(value) !== value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Identifiant sûr (UID) : lettres, chiffres, tiret, point, souligné ; le reste est retiré. */
function safeUid(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]/g, "");
  return cleaned || "session";
}

/** Fuseau IANA valide (vérifié par Intl), sinon ignoré : jamais de texte libre dans l'en-tête. */
function safeTimezone(value: string | null | undefined): string | null {
  if (!value || !/^[A-Za-z0-9_+\-/]+$/.test(value)) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

export function buildIcsCalendar(event: IcsEvent): string {
  const now = event.now ?? new Date();
  const duration = Math.max(1, Math.floor(event.durationMinutes));
  const end = new Date(event.startAt.getTime() + duration * 60_000);
  const url = safeHttpUrl(event.url);
  const reminder = event.reminderMinutes ?? 15;
  const timezone = safeTimezone(event.timezone);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LMS SaaS//Sessions live//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(timezone ? [`X-WR-TIMEZONE:${timezone}`] : []),
    "BEGIN:VEVENT",
    `UID:${safeUid(event.uid)}@live-sessions`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(event.startAt)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (url) {
    lines.push(`LOCATION:${escapeIcsText(url)}`);
    lines.push(`URL:${url}`);
  }
  if (reminder > 0) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(event.reminderText ?? event.title)}`,
      `TRIGGER:-PT${Math.floor(reminder)}M`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
