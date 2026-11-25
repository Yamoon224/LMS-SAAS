import { INTL_TAGS } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";

/** Libellés de mise en forme (« Gratuit », « FCFA », « min », « h ») : `copy.format`. */
type FormatCopy = Copy["format"];

/** Prix en unité entière de la devise (XOF sans décimales). 0 => libellé « gratuit ». */
export function formatPrice(amount: number, currency: string, locale: Locale, labels: FormatCopy): string {
  if (amount === 0) return labels.free;
  const label = currency === "XOF" ? labels.currencyXof : currency;
  return `${new Intl.NumberFormat(INTL_TAGS[locale]).format(amount)} ${label}`;
}

export function formatDuration(minutes: number | null | undefined, labels: FormatCopy): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} ${labels.minutesShort}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest
    ? `${hours} ${labels.hoursShort} ${String(rest).padStart(2, "0")}`
    : `${hours} ${labels.hoursShort}`;
}

export function formatDate(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(INTL_TAGS[locale], { dateStyle: "long" });
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(INTL_TAGS[locale], { dateStyle: "full", timeStyle: "short" });
}

export function formatRelative(value: string | Date, locale: Locale): string {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(INTL_TAGS[locale], { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(minutes) < 60 * 24) return rtf.format(Math.round(minutes / 60), "hour");
  return rtf.format(Math.round(minutes / (60 * 24)), "day");
}
