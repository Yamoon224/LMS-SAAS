import {
  recoveryCodesSchema,
  twoFactorSetupSchema,
  twoFactorStatusSchema,
} from "@/features/auth/schemas/two-factor.schema";
import type { PasswordAndCodeValues, TwoFactorSetup, TwoFactorStatus } from "@/features/auth/schemas/two-factor.schema";
import { apiClient } from "@/lib/api-client";

/** Routes 2FA authentifiées (propre compte) : appelées via le proxy /api/backend, jeton en cookie httpOnly. */
export async function fetchTwoFactorStatus(): Promise<TwoFactorStatus> {
  return twoFactorStatusSchema.parse(await apiClient.get<unknown>("/auth/2fa/status"));
}

export async function startTwoFactorSetup(): Promise<TwoFactorSetup> {
  return twoFactorSetupSchema.parse(await apiClient.post<unknown>("/auth/2fa/setup"));
}

export async function enableTwoFactor(code: string): Promise<string[]> {
  const data = await apiClient.post<unknown, { code: string }>("/auth/2fa/enable", { code });
  return recoveryCodesSchema.parse(data).recoveryCodes;
}

export async function disableTwoFactor(values: PasswordAndCodeValues): Promise<void> {
  await apiClient.post<unknown, PasswordAndCodeValues>("/auth/2fa/disable", values);
}

export async function regenerateRecoveryCodes(values: PasswordAndCodeValues): Promise<string[]> {
  const data = await apiClient.post<unknown, PasswordAndCodeValues>("/auth/2fa/recovery-codes", values);
  return recoveryCodesSchema.parse(data).recoveryCodes;
}
