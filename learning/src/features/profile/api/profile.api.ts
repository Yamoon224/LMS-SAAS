import { enabledLanguageSchema, profileSchema } from "../schemas/profile.schema";
import type { EnabledLanguage, Profile, ProfileFormValues } from "../schemas/profile.schema";

import { apiClient } from "@/lib/api-client";

/** GET /public/account/me — mon profil (PUB-04). */
export async function fetchProfile(): Promise<Profile> {
  return profileSchema.parse(await apiClient.get<unknown>("/public/account/me"));
}

/** GET /public/languages — langues proposées (ADM-40). */
export async function fetchEnabledLanguages(): Promise<EnabledLanguage[]> {
  return enabledLanguageSchema.array().parse(await apiClient.get<unknown>("/public/languages"));
}

export interface UpdateProfileInput {
  values: ProfileFormValues;
  /** Langue actuelle du profil : n'est envoyée que si elle change (elle a pu être désactivée depuis). */
  currentLocale: string;
}

/** PATCH /public/account/me — nom, téléphone, langue. Téléphone vide et langue inchangée ne sont pas envoyés. */
export async function updateProfile({ values, currentLocale }: UpdateProfileInput): Promise<Profile> {
  const response = await fetch("/api/backend/public/account/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: values.firstName,
      lastName: values.lastName,
      ...(values.locale !== currentLocale ? { locale: values.locale } : {}),
      ...(values.phone ? { phone: values.phone } : {}),
    }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(message ?? "");
  }
  return profileSchema.parse(await response.json());
}
