import { Inject, Injectable } from "@nestjs/common";

import { renderTemplate } from "../domain/notification-template";
import { TEMPLATE_OVERRIDE_REPOSITORY } from "../domain/template-override.repository.port";
import type { TemplateOverrideRepositoryPort } from "../domain/template-override.repository.port";
import {
  allowedVariables,
  isKnownTemplate,
  isOverridableLocale,
  knownTemplateKeys,
  OVERRIDABLE_LOCALES,
  placeholderPayload,
  requiredVariables,
  TemplateOverrideInvalidError,
  TemplateUnknownError,
  validateOverride,
} from "../domain/template-overrides";

export interface NotificationTemplateView {
  templateKey: string;
  locale: string;
  /** Variables utilisables avec la syntaxe `{{variable}}`. */
  variables: string[];
  /** Variables qui doivent figurer dans le contenu. */
  requiredVariables: string[];
  /** Texte actuellement envoyé (surcharge si elle existe, sinon texte d'origine). */
  subject: string;
  body: string;
  isCustomized: boolean;
  defaultSubject: string;
  defaultBody: string;
  updatedAt: Date | null;
}

function assertTarget(templateKey: string, locale: string): void {
  if (!isKnownTemplate(templateKey)) {
    throw new TemplateUnknownError(`Modèle de notification inconnu: ${templateKey}`);
  }
  if (!isOverridableLocale(locale)) {
    throw new TemplateOverrideInvalidError(
      `Langue non modifiable: ${locale}. Langues : ${OVERRIDABLE_LOCALES.join(", ")}.`,
    );
  }
}

/** ADM-38 : tous les modèles dans toutes les langues modifiables, avec leur texte d'origine et leur éventuelle surcharge. */
@Injectable()
export class ListNotificationTemplatesUseCase {
  constructor(@Inject(TEMPLATE_OVERRIDE_REPOSITORY) private readonly repository: TemplateOverrideRepositoryPort) {}

  async execute(): Promise<NotificationTemplateView[]> {
    const overrides = await this.repository.listAll();
    const byKey = new Map(overrides.map((override) => [`${override.templateKey}|${override.locale}`, override]));

    return knownTemplateKeys().flatMap((templateKey) =>
      OVERRIDABLE_LOCALES.map((locale): NotificationTemplateView => {
        const original = renderTemplate(templateKey, locale, placeholderPayload(templateKey));
        const override = byKey.get(`${templateKey}|${locale}`);
        return {
          templateKey,
          locale,
          variables: allowedVariables(templateKey),
          requiredVariables: requiredVariables(templateKey),
          subject: override?.subject ?? original.subject,
          body: override?.body ?? original.body,
          isCustomized: override !== undefined,
          defaultSubject: original.subject,
          defaultBody: original.body,
          updatedAt: override?.updatedAt ?? null,
        };
      }),
    );
  }
}

@Injectable()
export class SaveNotificationTemplateUseCase {
  constructor(@Inject(TEMPLATE_OVERRIDE_REPOSITORY) private readonly repository: TemplateOverrideRepositoryPort) {}

  async execute(templateKey: string, locale: string, subject: string, body: string): Promise<void> {
    assertTarget(templateKey, locale);
    validateOverride(templateKey, subject, body);
    await this.repository.upsert(templateKey, locale, subject.trim(), body);
  }
}

/** Retour au texte d'origine. */
@Injectable()
export class ResetNotificationTemplateUseCase {
  constructor(@Inject(TEMPLATE_OVERRIDE_REPOSITORY) private readonly repository: TemplateOverrideRepositoryPort) {}

  async execute(templateKey: string, locale: string): Promise<void> {
    assertTarget(templateKey, locale);
    await this.repository.remove(templateKey, locale);
  }
}
