import { describe, expect, it } from "vitest";

import {
  buildSettingsPatch,
  financeSettingsFormSchema,
  financeSettingsResponseSchema,
  toFormValues,
} from "./finance-settings.schema";
import type { FinanceSettings } from "./finance-settings.schema";

const current: FinanceSettings = {
  retentionDays: 7,
  minimumPayoutThreshold: 10000,
  payoutFrequency: "MANUAL",
  transactionFeeBearer: "TENANT",
};

describe("financeSettingsFormSchema", () => {
  const valid = toFormValues(current);

  it("accepte les valeurs actuelles", () => {
    expect(financeSettingsFormSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte les bornes 0 et 90 jours", () => {
    expect(financeSettingsFormSchema.safeParse({ ...valid, retentionDays: "0" }).success).toBe(true);
    expect(financeSettingsFormSchema.safeParse({ ...valid, retentionDays: "90" }).success).toBe(true);
  });

  it.each(["91", "-1", "7.5", "", "abc", "1e2"])("refuse une rétention invalide (%j)", (retentionDays) => {
    expect(financeSettingsFormSchema.safeParse({ ...valid, retentionDays }).success).toBe(false);
  });

  it.each(["-5", "10.5", "", "dix mille"])("refuse un seuil invalide (%j)", (minimumPayoutThreshold) => {
    expect(financeSettingsFormSchema.safeParse({ ...valid, minimumPayoutThreshold }).success).toBe(false);
  });

  it("accepte un seuil de 0 et refuse une fréquence ou un porteur de frais inconnus", () => {
    expect(financeSettingsFormSchema.safeParse({ ...valid, minimumPayoutThreshold: "0" }).success).toBe(true);
    expect(financeSettingsFormSchema.safeParse({ ...valid, payoutFrequency: "DAILY" }).success).toBe(false);
    expect(financeSettingsFormSchema.safeParse({ ...valid, transactionFeeBearer: "ALL" }).success).toBe(false);
  });
});

describe("buildSettingsPatch", () => {
  it("n'envoie rien si rien n'a changé", () => {
    expect(buildSettingsPatch(current, toFormValues(current))).toEqual({});
  });

  it("n'envoie que les champs modifiés, en nombres", () => {
    const values = { ...toFormValues(current), retentionDays: "14", transactionFeeBearer: "PLATFORM" as const };
    expect(buildSettingsPatch(current, values)).toEqual({ retentionDays: 14, transactionFeeBearer: "PLATFORM" });
  });
});

describe("financeSettingsResponseSchema", () => {
  it("lit la réponse du serveur", () => {
    const parsed = financeSettingsResponseSchema.parse({
      settings: current,
      defaults: current,
      limits: { maxRetentionDays: 90, maxPayoutThreshold: 1_000_000_000 },
    });
    expect(parsed.settings.retentionDays).toBe(7);
  });

  it("refuse une réponse mal formée", () => {
    expect(financeSettingsResponseSchema.safeParse({ settings: { retentionDays: "7" } }).success).toBe(false);
  });
});
