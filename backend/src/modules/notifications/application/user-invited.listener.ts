import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { UserInvitedEvent } from "@modules/users/users.events";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BACKOFFICE_SUFFIX } from "@shared/constants/reserved-slugs";

import { buildActivationUrl } from "../domain/activation-url";

import { NotifyUserUseCase } from "./notify-user.use-case";

/** ADM-05/ENT-10: envoi automatique du lien d'activation par e-mail, vers la surface propre à l'utilisateur. */
@Injectable()
export class UserInvitedListener {
  private readonly logger = new Logger(UserInvitedListener.name);

  constructor(
    private readonly notifyUserUseCase: NotifyUserUseCase,
    private readonly usersFacade: UsersFacade,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  @OnEvent("user.invited")
  async handle(event: UserInvitedEvent): Promise<void> {
    const user = await this.usersFacade.findById(event.userId);
    if (!user) {
      this.logger.warn(`Utilisateur introuvable pour l'invitation: ${event.userId}`);
      return;
    }
    const tenant = user.tenantId ? await this.tenantsFacade.findById(user.tenantId) : null;

    const activationUrl = buildActivationUrl({
      token: event.activationToken,
      userType: user.type,
      tenantSlug: tenant?.slug ?? null,
      baseDomain: process.env.APP_BASE_DOMAIN ?? "votredomaine.local",
      protocol: process.env.APP_URL_PROTOCOL ?? "https",
      backofficeSuffix: BACKOFFICE_SUFFIX,
    });

    await this.notifyUserUseCase.execute({
      userId: event.userId,
      templateKey: "user.invited",
      payload: { activationUrl },
    });
  }
}
