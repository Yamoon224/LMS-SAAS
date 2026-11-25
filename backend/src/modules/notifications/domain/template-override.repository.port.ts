export interface TemplateOverride {
  templateKey: string;
  locale: string;
  subject: string;
  body: string;
  updatedAt: Date;
}

export interface TemplateOverrideRepositoryPort {
  find(templateKey: string, locale: string): Promise<TemplateOverride | null>;
  listAll(): Promise<TemplateOverride[]>;
  /** Crée ou remplace la surcharge d'un modèle pour une langue. */
  upsert(templateKey: string, locale: string, subject: string, body: string): Promise<void>;
  /** Supprime la surcharge : le texte d'origine redevient actif. Idempotent. */
  remove(templateKey: string, locale: string): Promise<void>;
}

export const TEMPLATE_OVERRIDE_REPOSITORY = Symbol("TEMPLATE_OVERRIDE_REPOSITORY");
