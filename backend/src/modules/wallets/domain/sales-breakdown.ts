/** Écriture du grand livre utile à la ventilation d'une période (champs minimaux). */
export interface BreakdownLedgerRow {
  sourceId: string;
  account: string;
  direction: string;
  sourceType: string;
  amount: number;
}

/** Relevé détaillé d'une période : brut, commission, frais, net (étape 30, ENT-69). */
export interface SalesBreakdown {
  salesCount: number;
  /** Montant encaissé auprès des acheteurs. */
  gross: number;
  /** Commission de la plateforme (écritures COMMISSION). */
  commission: number;
  /** Frais du fournisseur déduits du net de l'entreprise (brut − commission − net). */
  feeChargedToTenant: number;
  /** Retenue d'anciennes ventes (avant l'isolation des écritures) dont commission et frais ne sont pas distinguables. */
  unallocated: number;
  /** Net crédité à l'entreprise pour ces ventes. */
  net: number;
  /** Net repris par des remboursements et commissions de ventes hors plateforme sur la période. */
  deductions: number;
}

/**
 * Agrège les écritures d'une période en un relevé détaillé. Fonction pure. Compatibilité : une vente sans écriture
 * de ventilation (enregistrée avant l'étape 30) ne peut pas être scindée — sa retenue (brut − net) va dans
 * `unallocated` plutôt que d'être attribuée à tort à la commission ou aux frais.
 * Invariant : gross = commission + feeChargedToTenant + unallocated + net.
 */
export function summarizeSalesBreakdown(rows: readonly BreakdownLedgerRow[]): SalesBreakdown {
  const sales = new Map<string, SaleAccumulator>();
  let deductions = 0;

  for (const row of rows) {
    const kind = classifyRow(row);
    if (kind === "DEDUCTION") {
      deductions += row.amount;
    } else if (kind) {
      let entry = sales.get(row.sourceId);
      if (!entry) {
        entry = { gross: 0, net: 0, commission: 0, hasBreakdown: false };
        sales.set(row.sourceId, entry);
      }
      applyRow(entry, kind, row.amount);
    }
  }

  const result: SalesBreakdown = {
    salesCount: 0,
    gross: 0,
    commission: 0,
    feeChargedToTenant: 0,
    unallocated: 0,
    net: 0,
    deductions,
  };
  for (const entry of sales.values()) {
    if (entry.gross === 0 && entry.net === 0) continue; // écritures orphelines (hors fenêtre) : ignorées
    const retained = entry.gross - entry.net;
    result.salesCount += 1;
    result.gross += entry.gross;
    result.net += entry.net;
    if (entry.hasBreakdown || retained === 0) {
      result.commission += entry.commission;
      result.feeChargedToTenant += retained - entry.commission;
    } else {
      result.unallocated += retained;
    }
  }
  return result;
}

interface SaleAccumulator {
  gross: number;
  net: number;
  commission: number;
  hasBreakdown: boolean;
}

type RowKind = "GROSS" | "NET" | "COMMISSION" | "FEE" | "DEDUCTION";

function classifyRow(row: BreakdownLedgerRow): RowKind | null {
  const key = `${row.sourceType}|${row.account}|${row.direction}`;
  switch (key) {
    case "SALE|PROVIDER|DEBIT":
      return "GROSS";
    case "SALE|TENANT|CREDIT":
      return "NET";
    case "COMMISSION|PLATFORM|CREDIT":
      return "COMMISSION";
    case "FEE|PROVIDER|CREDIT":
      return "FEE";
    case "REFUND|TENANT|DEBIT":
    case "OFFLINE_COMMISSION|TENANT|DEBIT":
      return "DEDUCTION";
    default:
      return null;
  }
}

function applyRow(entry: SaleAccumulator, kind: Exclude<RowKind, "DEDUCTION">, amount: number): void {
  if (kind === "GROSS") entry.gross += amount;
  else if (kind === "NET") entry.net += amount;
  else if (kind === "COMMISSION") {
    entry.commission += amount;
    entry.hasBreakdown = true;
  } else entry.hasBreakdown = true;
}
