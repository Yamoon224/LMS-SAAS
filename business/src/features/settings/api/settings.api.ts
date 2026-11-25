import { tenantSettingsSchema } from "../schemas/settings.schema";
import type {
  BrandingFormValues,
  ContactsFormValues,
  OfflinePaymentFormValues,
  PayoutAccountFormValues,
  TenantSettings,
} from "../schemas/settings.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/settings (permission settings.manage) : compte de reversement MASQUÉ. */
export async function fetchSettings(): Promise<TenantSettings> {
  return tenantSettingsSchema.parse(await apiClient.get<unknown>("/business/settings"));
}

/** PUT /business/settings/branding — nom d'affichage, logo https, couleurs #RRGGBB (ENT-08). */
export async function saveBranding(values: BrandingFormValues): Promise<TenantSettings> {
  return tenantSettingsSchema.parse(await apiClient.put<unknown, BrandingFormValues>("/business/settings/branding", values));
}

/** PUT /business/settings/contacts — contacts et informations légales (ENT-08). */
export async function saveContacts(values: ContactsFormValues): Promise<TenantSettings> {
  return tenantSettingsSchema.parse(await apiClient.put<unknown, ContactsFormValues>("/business/settings/contacts", values));
}

/** PUT /business/settings/offline-payment — activation et instructions (ENT-12). */
export async function saveOfflinePayment(values: OfflinePaymentFormValues): Promise<TenantSettings> {
  return tenantSettingsSchema.parse(
    await apiClient.put<unknown, OfflinePaymentFormValues>("/business/settings/offline-payment", values),
  );
}

/** PUT /business/settings/payout-account — mot de passe actuel exigé ; remet le compte à « non vérifié » (ENT-11). */
export async function savePayoutAccount(values: PayoutAccountFormValues): Promise<TenantSettings> {
  return tenantSettingsSchema.parse(
    await apiClient.put<unknown, PayoutAccountFormValues>("/business/settings/payout-account", values),
  );
}
