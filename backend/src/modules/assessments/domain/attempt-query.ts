/**
 * ENT-37 : filtres, pagination et export CSV de la liste des tentatives d'examen côté entreprise (fonctions pures).
 */
export interface AttemptListRow {
  id: string;
  enrollmentId: string;
  learnerName: string | null;
  email: string | null;
  status: string;
  scorePercent: number | null;
  startedAt: Date;
  submittedAt: Date | null;
}

export interface AttemptFilters {
  /** Recherche (nom ou e-mail), insensible à la casse et aux accents. */
  learner?: string;
  status?: string;
  /** Bornes sur la date de début de la tentative (incluses). */
  from?: Date;
  to?: Date;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function filterAttempts(rows: readonly AttemptListRow[], filters: AttemptFilters): AttemptListRow[] {
  const needle = filters.learner ? normalize(filters.learner) : "";
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.from && row.startedAt < filters.from) return false;
    if (filters.to && row.startedAt > filters.to) return false;
    if (needle) {
      const haystack = normalize(`${row.learnerName ?? ""} ${row.email ?? ""}`);
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Page 1-based ; taille bornée à [1, 100] ; une page hors limites renvoie une liste vide (total conservé). */
export function paginate<T>(items: readonly T[], page: number | undefined, pageSize: number | undefined): Page<T> {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize ?? DEFAULT_PAGE_SIZE)));
  const current = Math.max(1, Math.floor(page ?? 1));
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), total: items.length, page: current, pageSize: size };
}

/** Durée en secondes entre début et soumission, ou null si la tentative n'est pas soumise. */
export function attemptDurationSeconds(startedAt: Date, submittedAt: Date | null): number | null {
  if (!submittedAt) return null;
  return Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000));
}

/** Neutralise l'injection de formule tableur (=, +, -, @, tab, CR) puis applique le quoting CSV (RFC 4180). */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "En cours",
  SUBMITTED: "Soumise",
  PASSED: "Réussie",
  FAILED: "Échouée",
  EXPIRED: "Expirée",
};

const BOM = String.fromCharCode(0xfeff);

/** CSV (BOM UTF-8 pour Excel, CRLF). */
export function buildAttemptsCsv(rows: readonly AttemptListRow[]): string {
  const header = ["Apprenant", "E-mail", "Statut", "Note (%)", "Début", "Soumission", "Durée (s)"];
  const lines = rows.map((row) =>
    [
      row.learnerName,
      row.email,
      STATUS_LABELS[row.status] ?? row.status,
      row.scorePercent,
      row.startedAt.toISOString(),
      row.submittedAt?.toISOString() ?? null,
      attemptDurationSeconds(row.startedAt, row.submittedAt),
    ]
      .map(csvCell)
      .join(","),
  );
  return `${BOM}${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}
