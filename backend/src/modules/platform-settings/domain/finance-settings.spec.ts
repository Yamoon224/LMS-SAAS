import {
  DEFAULT_FINANCE_SETTINGS,
  InvalidFinanceSettingError,
  MAX_PAYOUT_THRESHOLD,
  MAX_RETENTION_DAYS,
  parseStoredSetting,
  resolveFinanceSettings,
  validateFinanceSetting,
} from "./finance-settings";

describe("validateFinanceSetting — bornes", () => {
  it("accepte les bornes de la rétention (0 et 90 jours)", () => {
    expect(validateFinanceSetting("retentionDays", 0)).toBe(0);
    expect(validateFinanceSetting("retentionDays", MAX_RETENTION_DAYS)).toBe(90);
  });

  it.each([-1, 91, 1.5, Number.NaN, "7", null, undefined])("refuse une rétention hors bornes ou non entière (%p)", (value) => {
    expect(() => validateFinanceSetting("retentionDays", value)).toThrow(InvalidFinanceSettingError);
  });

  it("accepte un seuil de 0, refuse un seuil négatif, décimal ou absurde", () => {
    expect(validateFinanceSetting("minimumPayoutThreshold", 0)).toBe(0);
    expect(() => validateFinanceSetting("minimumPayoutThreshold", -1)).toThrow(InvalidFinanceSettingError);
    expect(() => validateFinanceSetting("minimumPayoutThreshold", 10.5)).toThrow(InvalidFinanceSettingError);
    expect(() => validateFinanceSetting("minimumPayoutThreshold", MAX_PAYOUT_THRESHOLD + 1)).toThrow(InvalidFinanceSettingError);
  });

  it("n'accepte que les fréquences et porteurs de frais connus", () => {
    expect(validateFinanceSetting("payoutFrequency", "WEEKLY")).toBe("WEEKLY");
    expect(validateFinanceSetting("transactionFeeBearer", "PLATFORM")).toBe("PLATFORM");
    expect(() => validateFinanceSetting("payoutFrequency", "DAILY")).toThrow(InvalidFinanceSettingError);
    expect(() => validateFinanceSetting("transactionFeeBearer", "EVERYONE")).toThrow(InvalidFinanceSettingError);
  });
});

describe("resolveFinanceSettings — versionnement par date d'effet", () => {
  const at = new Date("2026-11-18T12:00:00Z");

  it("sans aucune ligne, renvoie les valeurs par défaut (comportement historique)", () => {
    expect(resolveFinanceSettings([], at)).toEqual(DEFAULT_FINANCE_SETTINGS);
    expect(DEFAULT_FINANCE_SETTINGS).toMatchObject({ retentionDays: 7, minimumPayoutThreshold: 10000, transactionFeeBearer: "TENANT" });
  });

  it("prend la ligne la plus récente dont la date d'effet est passée, ignore les futures", () => {
    const settings = resolveFinanceSettings(
      [
        { key: "RETENTION_DAYS", value: "14", effectiveFrom: new Date("2026-10-01T00:00:00Z") },
        { key: "RETENTION_DAYS", value: "3", effectiveFrom: new Date("2026-11-01T00:00:00Z") },
        { key: "RETENTION_DAYS", value: "30", effectiveFrom: new Date("2026-12-01T00:00:00Z") },
      ],
      at,
    );
    expect(settings.retentionDays).toBe(3);
  });

  it("l'ancienne valeur reste lisible à une date passée (la vente passée garde son contexte)", () => {
    const rows = [
      { key: "RETENTION_DAYS", value: "14", effectiveFrom: new Date("2026-10-01T00:00:00Z") },
      { key: "RETENTION_DAYS", value: "3", effectiveFrom: new Date("2026-11-01T00:00:00Z") },
    ];
    expect(resolveFinanceSettings(rows, new Date("2026-10-15T00:00:00Z")).retentionDays).toBe(14);
  });

  it("une valeur stockée corrompue retombe sur le défaut sans lever d'erreur", () => {
    expect(parseStoredSetting("RETENTION_DAYS", "9999")).toBe(7);
    expect(parseStoredSetting("PAYOUT_FREQUENCY", "???")).toBe("MANUAL");
    const settings = resolveFinanceSettings([{ key: "RETENTION_DAYS", value: "abc", effectiveFrom: new Date("2020-01-01") }], at);
    expect(settings.retentionDays).toBe(7);
  });

  it("ignore les clés inconnues", () => {
    expect(resolveFinanceSettings([{ key: "AUTRE", value: "1", effectiveFrom: new Date("2020-01-01") }], at)).toEqual(
      DEFAULT_FINANCE_SETTINGS,
    );
  });
});
