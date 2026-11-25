import { tenantPayoutAccountSchema } from "../schemas/payout-account.schema";
import type { TenantPayoutAccount } from "../schemas/payout-account.schema";

import { apiClient } from "@/lib/api-client";

/** GET /admin/tenants/:id/payout-account (permission tenants.read) : compte MASQUÉ + état de vérification. */
export async function fetchTenantPayoutAccount(tenantId: string): Promise<TenantPayoutAccount> {
  return tenantPayoutAccountSchema.parse(await apiClient.get<unknown>(`/admin/tenants/${tenantId}/payout-account`));
}

/** POST /admin/tenants/:id/payout-account/verify (permission payout-accounts.verify). */
export async function verifyTenantPayoutAccount(tenantId: string): Promise<TenantPayoutAccount> {
  return tenantPayoutAccountSchema.parse(
    await apiClient.post<unknown>(`/admin/tenants/${tenantId}/payout-account/verify`),
  );
}
