/** Montant entier en unité mineure de la devise (XOF: pas de décimales), formaté en français. */
export function formatAmount(amount: number, currency = "XOF"): string {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

export function formatDate(date: Date | null | undefined): string {
  return date ? date.toLocaleDateString("fr-FR") : "—";
}

export function formatDateTime(date: Date | null | undefined): string {
  return date ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
}
