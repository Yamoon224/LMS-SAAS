import { UsersFacade } from "@modules/users/users.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import { describeError } from "../domain/describe-error";
import { EMAIL_SENDER, type EmailSenderPort } from "../domain/email-sender.port";
import { NotificationChannel } from "../domain/notification-channel";
import { renderTemplate } from "../domain/notification-template";
import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.port";
import type { NotificationRepositoryPort } from "../domain/notification.repository.port";
import { SMS_SENDER, type SmsSenderPort } from "../domain/sms-sender.port";
import { TEMPLATE_OVERRIDE_REPOSITORY } from "../domain/template-override.repository.port";
import type { TemplateOverrideRepositoryPort } from "../domain/template-override.repository.port";
import { renderOverride } from "../domain/template-overrides";

/**
 * Section 12.7: traite une notification en file — résout le destinataire,
 * rend le gabarit, envoie sur le canal demandé. Une notification IN_APP n'a
 * rien à envoyer : son existence en base (déjà créée par
 * EnqueueNotificationUseCase) est la notification elle-même, affichée par
 * ListNotificationsUseCase.
 */
@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepository: NotificationRepositoryPort,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSenderPort,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSenderPort,
    @Inject(TEMPLATE_OVERRIDE_REPOSITORY) private readonly templateOverrideRepository: TemplateOverrideRepositoryPort,
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundDomainError(`Notification introuvable: ${notificationId}`);
    }

    try {
      if (notification.channel === NotificationChannel.IN_APP) {
        notification.markSent();
        await this.notificationRepository.save(notification);
        return;
      }

      const recipient = await this.usersFacade.findById(notification.recipientUserId);
      if (!recipient) {
        throw new Error(`Destinataire introuvable: ${notification.recipientUserId}`);
      }

      const payload = { ...notification.payload };
      // ADM-38 : le texte modifié par l'Admin pour cette langue prime sur le texte d'origine.
      const override = await this.templateOverrideRepository.find(notification.templateKey, notification.locale);
      const rendered = override
        ? renderOverride(override, payload)
        : renderTemplate(notification.templateKey, notification.locale, payload);

      if (notification.channel === NotificationChannel.EMAIL) {
        await this.emailSender.send({ to: recipient.email, subject: rendered.subject, body: rendered.body });
      } else if (notification.channel === NotificationChannel.SMS) {
        if (!recipient.phone) {
          throw new Error(`Destinataire sans numéro de téléphone: ${recipient.id}`);
        }
        await this.smsSender.send({ to: recipient.phone, body: rendered.body });
      }

      notification.markSent();
      await this.notificationRepository.save(notification);
    } catch (error) {
      const message = describeError(error);
      this.logger.error(`Échec de l'envoi de la notification ${notificationId}: ${message}`);
      notification.markFailed(message);
      await this.notificationRepository.save(notification);
      throw error; // laisse BullMQ appliquer sa politique de nouvelle tentative.
    }
  }
}
