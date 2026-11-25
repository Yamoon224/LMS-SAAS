import { z } from "zod";

/** Doit rester cohérent avec backend/.../integrations/domain/integration-catalog.ts. */
export const integrationFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "url", "host", "port", "boolean", "email", "pem"]),
  secret: z.boolean(),
  required: z.boolean(),
  /** Valeur enregistrée (champs non secrets) ; toujours `null` pour un secret. */
  value: z.string().nullable(),
  configured: z.boolean(),
});
export type IntegrationField = z.infer<typeof integrationFieldSchema>;

/** GET /admin/integrations */
export const integrationSchema = z.object({
  provider: z.string(),
  label: z.string(),
  description: z.string(),
  source: z.enum(["PLATFORM", "ENVIRONMENT", "NONE"]),
  updatedAt: z.coerce.date().nullable(),
  fields: z.array(integrationFieldSchema),
});
export type Integration = z.infer<typeof integrationSchema>;

export const SOURCE_LABELS = {
  PLATFORM: "Configurée dans l'Admin",
  ENVIRONMENT: "Variables d'environnement du serveur",
  NONE: "Non configurée",
} as const;

/** Saisie du formulaire : texte par champ, plus les secrets que l'on veut supprimer. */
export interface IntegrationFormState {
  values: Record<string, string>;
  clearSecrets: string[];
}

export function initialFormState(integration: Integration): IntegrationFormState {
  const values: Record<string, string> = {};
  for (const field of integration.fields) {
    // Un secret n'est JAMAIS prérempli : le serveur ne le renvoie pas.
    values[field.key] = field.secret ? "" : (field.value ?? "");
  }
  return { values, clearSecrets: [] };
}

/**
 * Corps de PUT /admin/integrations/:provider. Un secret laissé vide est omis (le serveur le conserve) ;
 * une case « supprimer » le retire explicitement ; un champ clair vide est omis (= non défini).
 */
export function buildSaveBody(
  integration: Integration,
  state: IntegrationFormState,
): { values: Record<string, string>; clearSecrets: string[] } {
  const values: Record<string, string> = {};
  const clearSecrets: string[] = [];
  for (const field of integration.fields) {
    const text = (state.values[field.key] ?? "").trim();
    if (field.secret && state.clearSecrets.includes(field.key)) {
      clearSecrets.push(field.key);
    } else if (text !== "") {
      values[field.key] = text;
    }
  }
  return { values, clearSecrets };
}
