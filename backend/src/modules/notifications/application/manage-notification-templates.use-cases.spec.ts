import type { UsersFacade } from "@modules/users/users.facade";

import type { EmailSenderPort } from "../domain/email-sender.port";
import { NotificationChannel } from "../domain/notification-channel";
import { NotificationStatus } from "../domain/notification-status";
import { Notification } from "../domain/notification.entity";
import type { NotificationRepositoryPort } from "../domain/notification.repository.port";
import type { SmsSenderPort } from "../domain/sms-sender.port";
import type { TemplateOverride, TemplateOverrideRepositoryPort } from "../domain/template-override.repository.port";
import {
  knownTemplateKeys,
  OVERRIDABLE_LOCALES,
  TemplateOverrideInvalidError,
  TemplateUnknownError,
} from "../domain/template-overrides";

import {
  ListNotificationTemplatesUseCase,
  ResetNotificationTemplateUseCase,
  SaveNotificationTemplateUseCase,
} from "./manage-notification-templates.use-cases";
import { SendNotificationUseCase } from "./send-notification.use-case";

function buildRepository(overrides: TemplateOverride[] = []): jest.Mocked<TemplateOverrideRepositoryPort> {
  return {
    find: jest
      .fn()
      .mockImplementation(
        async (key: string, locale: string) =>
          overrides.find((override) => override.templateKey === key && override.locale === locale) ?? null,
      ),
    listAll: jest.fn().mockResolvedValue(overrides),
    upsert: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

const override = (overrides: Partial<TemplateOverride> = {}): TemplateOverride => ({
  templateKey: "payment.failed",
  locale: "fr",
  subject: "Paiement refusé",
  body: "Oups : {{amount}} {{currency}} pour {{firstName}}",
  updatedAt: new Date("2026-11-01T00:00:00Z"),
  ...overrides,
});

describe("ListNotificationTemplatesUseCase", () => {
  it("renvoie chaque modèle dans chaque langue modifiable, avec le texte d'origine en marqueurs {{variable}}", async () => {
    const views = await new ListNotificationTemplatesUseCase(buildRepository()).execute();
    expect(views).toHaveLength(knownTemplateKeys().length * OVERRIDABLE_LOCALES.length);
    const failed = views.find((view) => view.templateKey === "payment.failed" && view.locale === "fr");
    expect(failed).toMatchObject({ isCustomized: false, updatedAt: null });
    expect(failed?.body).toContain("{{amount}}");
    expect(failed?.subject).toBe(failed?.defaultSubject);
  });

  it("signale une surcharge et conserve le texte d'origine pour permettre le retour en arrière", async () => {
    const views = await new ListNotificationTemplatesUseCase(buildRepository([override()])).execute();
    const failed = views.find((view) => view.templateKey === "payment.failed" && view.locale === "fr");
    expect(failed).toMatchObject({ isCustomized: true, subject: "Paiement refusé" });
    expect(failed?.defaultSubject).toBe("Échec de paiement");
    const english = views.find((view) => view.templateKey === "payment.failed" && view.locale === "en");
    expect(english?.isCustomized).toBe(false);
  });

  it("indique les variables vitales de chaque modèle", async () => {
    const views = await new ListNotificationTemplatesUseCase(buildRepository()).execute();
    expect(views.find((view) => view.templateKey === "user.invited")?.requiredVariables).toEqual(["activationUrl"]);
  });
});

describe("SaveNotificationTemplateUseCase", () => {
  it("enregistre une surcharge valide", async () => {
    const repository = buildRepository();
    await new SaveNotificationTemplateUseCase(repository).execute(
      "user.password-reset",
      "en",
      " Reset ",
      "Hi {{firstName}}: {{resetUrl}}",
    );
    expect(repository.upsert).toHaveBeenCalledWith("user.password-reset", "en", "Reset", "Hi {{firstName}}: {{resetUrl}}");
  });

  it.each([
    ["modèle inconnu", "inconnu", "fr", "s", "b", TemplateUnknownError],
    ["langue non modifiable", "payment.failed", "ar", "s", "b", TemplateOverrideInvalidError],
    ["lien d'activation absent", "user.invited", "fr", "s", "Bonjour", TemplateOverrideInvalidError],
    ["variable inconnue", "payment.failed", "fr", "s", "{{secret}}", TemplateOverrideInvalidError],
    ["sujet sur deux lignes", "payment.failed", "fr", "a\nb", "c", TemplateOverrideInvalidError],
  ])("refuse sans rien enregistrer : %s", async (_label, key, locale, subject, body, error) => {
    const repository = buildRepository();
    await expect(new SaveNotificationTemplateUseCase(repository).execute(key, locale, subject, body)).rejects.toThrow(
      error,
    );
    expect(repository.upsert).not.toHaveBeenCalled();
  });
});

describe("ResetNotificationTemplateUseCase", () => {
  it("supprime la surcharge", async () => {
    const repository = buildRepository();
    await new ResetNotificationTemplateUseCase(repository).execute("payment.failed", "fr");
    expect(repository.remove).toHaveBeenCalledWith("payment.failed", "fr");
  });

  it("refuse un modèle ou une langue invalide", async () => {
    const repository = buildRepository();
    await expect(new ResetNotificationTemplateUseCase(repository).execute("x", "fr")).rejects.toThrow(
      TemplateUnknownError,
    );
    await expect(new ResetNotificationTemplateUseCase(repository).execute("payment.failed", "zz")).rejects.toThrow(
      TemplateOverrideInvalidError,
    );
    expect(repository.remove).not.toHaveBeenCalled();
  });
});

describe("SendNotificationUseCase et surcharges", () => {
  function buildNotification(locale: string): Notification {
    return Notification.fromPersistence({
      id: "n1",
      tenantId: null,
      recipientUserId: "u1",
      channel: NotificationChannel.EMAIL,
      templateKey: "payment.failed",
      locale,
      payload: { amount: 25000, currency: "XOF", firstName: "Awa" },
      status: NotificationStatus.PENDING,
      errorMessage: null,
      createdAt: new Date(),
      sentAt: null,
      readAt: null,
    });
  }

  function build(overrides: TemplateOverride[], locale: string) {
    const notification = buildNotification(locale);
    const notifications = {
      findById: jest.fn().mockResolvedValue(notification),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepositoryPort;
    const email: jest.Mocked<EmailSenderPort> = { send: jest.fn().mockResolvedValue(undefined) };
    const sms: jest.Mocked<SmsSenderPort> = { send: jest.fn().mockResolvedValue(undefined) };
    const users = {
      findById: jest.fn().mockResolvedValue({ id: "u1", email: "awa@example.com", phone: null }),
    } as unknown as UsersFacade;
    const useCase = new SendNotificationUseCase(notifications, email, sms, buildRepository(overrides), users);
    return { useCase, email };
  }

  it("envoie le texte modifié par l'Admin, variables remplacées", async () => {
    const { useCase, email } = build([override()], "fr");
    await useCase.execute("n1");
    expect(email.send).toHaveBeenCalledWith({
      to: "awa@example.com",
      subject: "Paiement refusé",
      body: "Oups : 25000 XOF pour Awa",
    });
  });

  it("envoie le texte d'origine sans surcharge pour cette langue", async () => {
    const { useCase, email } = build([override({ locale: "fr" })], "en");
    await useCase.execute("n1");
    const sent = email.send.mock.calls[0]?.[0];
    expect(sent?.subject).toBe("Payment failed");
    expect(sent?.body).toContain("25000 XOF");
  });
});
