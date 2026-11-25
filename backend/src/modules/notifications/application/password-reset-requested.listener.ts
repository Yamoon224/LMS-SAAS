import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { PasswordResetRequestedEvent } from "@modules/users/users.events";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BACKOFFICE_SUFFIX } from "@shared/constants/reserved-slugs";

import { buildActivationUrl } from "../domain/activation-url";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** PUB-04 : envoie le lien de réinitialisation vers la surface propre à l'utilisateur (admin, back-office, apprenant). */
@Injectable()
export class PasswordResetRequestedListener {
  private readonly logger = new Logger(PasswordResetRequestedListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly usersFacade: UsersFacade,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  @OnEvent("user.password-reset-requested")
  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    const user = await this.usersFacade.findById(event.userId);
    if (!user) {
      this.logger.warn(`Utilisateur introuvable pour la réinitialisation: ${event.userId}`);
      return;
    }
    const tenant = user.tenantId ? await this.tenantsFacade.findById(user.tenantId) : null;

    const resetUrl = buildActivationUrl({
      token: event.resetToken,
      userType: user.type,
      tenantSlug: tenant?.slug ?? null,
      baseDomain: process.env.APP_BASE_DOMAIN ?? "votredomaine.local",
      protocol: process.env.APP_URL_PROTOCOL ?? "https",
      backofficeSuffix: BACKOFFICE_SUFFIX,
      path: "/reset-password",
    });

    await this.notifyUserUseCase.execute({
      userId: event.userId,
      templateKey: "user.password-reset",
      payload: { resetUrl },
    });
  }
}
