import { UsersFacade } from "@modules/users/users.facade";
import { Injectable, Logger } from "@nestjs/common";

import { NotificationChannel } from "../domain/notification-channel";

import { EnqueueNotificationUseCase } from "./enqueue-notification.use-case";

export interface NotifyUserInput {
  userId: string;
  templateKey: string;
  payload: Record<string, unknown>;
  /** EMAIL par défaut — la plupart des notifications transactionnelles passent par e-mail (section 12.7). */
  channel?: NotificationChannel;
}

/**
 * Point d'entrée commun à la majorité des listeners de ce module : résout
 * le destinataire (tenant, langue) puis délègue à EnqueueNotificationUseCase.
 * Évite de répéter cette résolution dans chaque listener d'événement.
 */
@Injectable()
export class NotifyUserUseCase {
  private readonly logger = new Logger(NotifyUserUseCase.name);

  constructor(
    private readonly enqueueNotificationUseCase: EnqueueNotificationUseCase,
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(input: NotifyUserInput): Promise<void> {
    const user = await this.usersFacade.findById(input.userId);
    if (!user) {
      this.logger.warn(`Destinataire introuvable pour la notification "${input.templateKey}": ${input.userId}`);
      return;
    }

    const firstName = user.fullName.split(" ")[0] ?? user.fullName;

    await this.enqueueNotificationUseCase.execute({
      tenantId: user.tenantId,
      recipientUserId: input.userId,
      channel: input.channel ?? NotificationChannel.EMAIL,
      templateKey: input.templateKey,
      locale: user.locale,
      payload: { firstName, ...input.payload },
    });
  }
}
