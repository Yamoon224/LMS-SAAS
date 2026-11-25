import { describe, expect, it } from "vitest";

import {
  brandingFormSchema,
  contactsFormSchema,
  isValidIban,
  offlinePaymentFormSchema,
  payoutAccountFormSchema,
  tenantSettingsSchema,
} from "./settings.schema";

const IBAN = "FR76 3000 6000 0112 3456 7890 189";

describe("brandingFormSchema", () => {
  it("accepte https et #RRGGBB, vide devient null", () => {
    const parsed = brandingFormSchema.parse({ displayName: "Acme", logoUrl: "https://cdn.acme.com/l.png", primaryColor: "#1d4ed8", secondaryColor: "" });
    expect(parsed).toEqual({ displayName: "Acme", logoUrl: "https://cdn.acme.com/l.png", primaryColor: "#1D4ED8", secondaryColor: null });
  });

  it.each(["http://acme.com/l.png", "javascript:alert(1)", "data:image/png;base64,AA", "https://u:p@acme.com/x", "pas une url"])("refuse le logo %s", (logoUrl) => {
    expect(brandingFormSchema.safeParse({ displayName: "A", logoUrl, primaryColor: "", secondaryColor: "" }).success).toBe(false);
  });

  it.each(["red", "#12345", "#GGGGGG", "#fff"])("refuse la couleur %s", (primaryColor) => {
    expect(brandingFormSchema.safeParse({ displayName: "A", logoUrl: "", primaryColor, secondaryColor: "" }).success).toBe(false);
  });

  it("le nom d'affichage est obligatoire", () => {
    expect(brandingFormSchema.safeParse({ displayName: "  ", logoUrl: "", primaryColor: "", secondaryColor: "" }).success).toBe(false);
  });
});

describe("contactsFormSchema", () => {
  it("valide e-mail et téléphone, vide devient null", () => {
    const parsed = contactsFormSchema.parse({ contactEmail: "a@b.co", contactPhone: "+225 07 00 00 00 00", legalName: "", registrationNumber: "", taxId: "", address: "" });
    expect(parsed.contactEmail).toBe("a@b.co");
    expect(parsed.legalName).toBeNull();
  });
  it("refuse e-mail et téléphone invalides", () => {
    const base = { legalName: "", registrationNumber: "", taxId: "", address: "" };
    expect(contactsFormSchema.safeParse({ ...base, contactEmail: "x", contactPhone: "" }).success).toBe(false);
    expect(contactsFormSchema.safeParse({ ...base, contactEmail: "", contactPhone: "123" }).success).toBe(false);
  });
});

describe("offlinePaymentFormSchema", () => {
  it("exige des instructions pour activer, refuse le HTML et les textes trop longs", () => {
    expect(offlinePaymentFormSchema.safeParse({ enabled: true, instructions: "" }).success).toBe(false);
    expect(offlinePaymentFormSchema.safeParse({ enabled: false, instructions: "" }).success).toBe(true);
    expect(offlinePaymentFormSchema.safeParse({ enabled: true, instructions: "<b>x</b>" }).success).toBe(false);
    expect(offlinePaymentFormSchema.safeParse({ enabled: true, instructions: "x".repeat(2001) }).success).toBe(false);
    expect(offlinePaymentFormSchema.safeParse({ enabled: true, instructions: "Virement au RIB X" }).success).toBe(true);
  });
});

describe("payoutAccountFormSchema", () => {
  const bank = { type: "BANK", accountNumber: IBAN, accountName: "Acme", currentPassword: "pw" } as const;

  it("accepte un IBAN valide, refuse une clé fausse", () => {
    expect(isValidIban(IBAN)).toBe(true);
    expect(payoutAccountFormSchema.safeParse(bank).success).toBe(true);
    expect(payoutAccountFormSchema.safeParse({ ...bank, accountNumber: "FR7630006000011234567890188" }).success).toBe(false);
  });

  it("Mobile Money : opérateur et numéro valides requis", () => {
    const mm = { type: "MOBILE_MONEY", operator: "WAVE", accountNumber: "0707070707", accountName: "Acme", currentPassword: "pw" } as const;
    expect(payoutAccountFormSchema.safeParse(mm).success).toBe(true);
    expect(payoutAccountFormSchema.safeParse({ ...mm, operator: undefined }).success).toBe(false);
    expect(payoutAccountFormSchema.safeParse({ ...mm, accountNumber: "12" }).success).toBe(false);
  });

  it("le mot de passe actuel est obligatoire", () => {
    expect(payoutAccountFormSchema.safeParse({ ...bank, currentPassword: "" }).success).toBe(false);
  });
});

describe("tenantSettingsSchema", () => {
  it("n'accepte que des numéros masqués dans le contrat", () => {
    const parsed = tenantSettingsSchema.parse({
      displayName: "Acme",
      branding: { logoUrl: null, primaryColor: null, secondaryColor: null },
      contactEmail: null,
      contactPhone: null,
      legalInfo: { legalName: null, registrationNumber: null, taxId: null, address: null },
      offlinePayment: { enabled: false, instructions: null },
      payoutAccount: { type: "BANK", operator: null, accountName: "Acme", maskedNumber: "***0189" },
      payoutAccountVerified: false,
    });
    expect(parsed.payoutAccount?.maskedNumber).toBe("***0189");
  });
});
