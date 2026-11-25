/**
 * ADM-22: solde d'une entreprise, dérivé du grand livre — jamais stocké
 * directement (BE-06: "les soldes sont calculés à partir du grand livre").
 */
export interface TenantBalance {
  tenantId: string;
  currency: string;
  /** Net des ventes dont la période de rétention n'est pas encore écoulée. */
  pendingAmount: number;
  /** Net disponible pour un reversement (RG-23). */
  availableAmount: number;
  /** Somme déjà reversée (historique). */
  payoutsExecutedAmount: number;
}

/** RG-23: un reversement ne porte que sur le solde disponible, au-dessus du seuil minimum. */
export function canRequestPayout(balance: TenantBalance, minimumThreshold: number): boolean {
  return balance.availableAmount >= minimumThreshold;
}
