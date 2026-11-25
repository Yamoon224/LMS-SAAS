import { describe, expect, it } from "vitest";

import { buildSaveBody, initialFormState, integrationSchema } from "./integration.schema";

const sms = integrationSchema.parse({
  provider: "SMS_GATEWAY",
  label: "Passerelle SMS",
  description: "…",
  source: "PLATFORM",
  updatedAt: "2026-11-17T10:00:00.000Z",
  fields: [
    { key: "apiUrl", label: "URL", kind: "url", secret: false, required: true, value: "https://sms.example.org", configured: true },
    { key: "apiKey", label: "Clé API", kind: "text", secret: true, required: true, value: null, configured: true },
    { key: "senderId", label: "Expéditeur", kind: "text", secret: false, required: false, value: null, configured: true },
  ],
});

describe("initialFormState", () => {
  it("préremplit les champs clairs et laisse les secrets vides", () => {
    expect(initialFormState(sms)).toEqual({ values: { apiUrl: "https://sms.example.org", apiKey: "", senderId: "" }, clearSecrets: [] });
  });
});

describe("buildSaveBody", () => {
  it("omet un secret laissé vide (le serveur le conserve) et les champs clairs vides", () => {
    const body = buildSaveBody(sms, { values: { apiUrl: " https://sms.example.org ", apiKey: "", senderId: "  " }, clearSecrets: [] });
    expect(body).toEqual({ values: { apiUrl: "https://sms.example.org" }, clearSecrets: [] });
  });

  it("envoie un nouveau secret saisi", () => {
    expect(buildSaveBody(sms, { values: { apiUrl: "https://sms.example.org", apiKey: "nouvelle", senderId: "" }, clearSecrets: [] }).values.apiKey).toBe(
      "nouvelle",
    );
  });

  it("une suppression explicite l'emporte sur une saisie et n'envoie pas la valeur", () => {
    const body = buildSaveBody(sms, { values: { apiUrl: "https://sms.example.org", apiKey: "x", senderId: "" }, clearSecrets: ["apiKey"] });
    expect(body.clearSecrets).toEqual(["apiKey"]);
    expect(body.values).not.toHaveProperty("apiKey");
  });
});

describe("integrationSchema", () => {
  it("refuse un type de champ inconnu", () => {
    expect(() => integrationSchema.parse({ ...sms, fields: [{ ...sms.fields[0], kind: "autre" }] })).toThrow();
  });
});
