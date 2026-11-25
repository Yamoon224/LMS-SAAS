import { NotificationsFacade } from "@modules/notifications/notifications.facade";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";

import {
  buildQuotaUsage,
  TENANT_AUDIT_LIMIT,
  TENANT_OVERVIEW_ROW_LIMIT,
  TENANT_USERS_LIMIT,
} from "../domain/tenant-overview";
import type {
  TenantAuditEntry,
  TenantFinances,
  InvitationMessage,
  InvitationMessageRecord,
  TenantInvitation,
  TenantOverview,
  TenantProfile,
  TenantSubscriptionRow,
  TenantUser,
} from "../domain/tenant-overview";
import { TENANT_OVERVIEW_REPOSITORY } from "../domain/tenant-overview.repository.port";
import type { TenantOverviewRepositoryPort } from "../domain/tenant-overview.repository.port";

/** Abonnements qui ouvrent des droits : le plus récent d'entre eux est « l'abonnement courant ». */
const CURRENT_STATUSES: readonly TenantSubscriptionRow["status"][] = ["ACTIVE", "TRIALING", "GRACE_PERIOD"];

function withoutQuotas({ quotas: _quotas, ...row }: TenantSubscriptionRow): Omit<TenantSubscriptionRow, "quotas"> {
  return row;
}

/** ADM-10 : fiche 360° d'une entreprise, en quatre lectures (aperçu, utilisateurs, finances, audit). */
@Injectable()
export class GetTenantOverviewUseCase {
  constructor(
    @Inject(TENANT_OVERVIEW_REPOSITORY) private readonly repository: TenantOverviewRepositoryPort,
    private readonly tenantsFacade: TenantsFacade,
    private readonly notificationsFacade: NotificationsFacade,
  ) {}

  async overview(tenantId: string, now: Date = new Date()): Promise<TenantOverview> {
    const tenant = await this.requireProfile(tenantId);
    const [facadeTenant, owners, subscriptions, usageCounts] = await Promise.all([
      this.tenantsFacade.findById(tenantId),
      this.repository.findOwners(tenantId),
      this.repository.listSubscriptions(tenantId, TENANT_OVERVIEW_ROW_LIMIT),
      this.repository.getUsageCounts(tenantId, now),
    ]);

    const current = subscriptions.find((row) => CURRENT_STATUSES.includes(row.status)) ?? null;
    return {
      tenant,
      branding: facadeTenant?.publicBranding ?? { logoUrl: null, primaryColor: null, bannerUrl: null, description: null },
      contacts: owners,
      subscription: { current: current ? withoutQuotas(current) : null, history: subscriptions.map(withoutQuotas) },
      usage: {
        quotas: buildQuotaUsage(current?.quotas ?? null, usageCounts),
        courses: usageCounts.courses,
        publishedCourses: usageCounts.publishedCourses,
        activeLearners: usageCounts.activeLearners,
        totalLearners: usageCounts.totalLearners,
        creditsBalance: usageCounts.creditsBalance,
        lastActivityAt: usageCounts.lastActivityAt,
      },
    };
  }

  async invitations(tenantId: string): Promise<TenantInvitation[]> {
    await this.requireProfile(tenantId);
    const records = await this.repository.listOwnerInvitations(tenantId);
    return records.map(({ message, ...invitation }) => ({
      ...invitation,
      message: message ? this.renderInvitationMessage(message) : null,
    }));
  }

  /** Reconstitue l'e-mail envoyé ; le jeton du lien d'activation est masqué (c'est un secret d'accès au compte). */
  private renderInvitationMessage(message: InvitationMessageRecord): InvitationMessage {
    const payload = { ...message.payload };
    if (typeof payload.activationUrl === "string") {
      payload.activationUrl = payload.activationUrl.replace(/token=[^&\s]*/, "token=••••••••");
    }
    const { subject, body } = this.notificationsFacade.render("user.invited", message.locale, payload);
    return {
      channel: message.channel,
      subject,
      body,
      status: message.status,
      sentAt: message.sentAt,
      errorMessage: message.errorMessage,
    };
  }

  async users(tenantId: string): Promise<TenantUser[]> {
    await this.requireProfile(tenantId);
    return this.repository.listUsers(tenantId, TENANT_USERS_LIMIT);
  }

  async finances(tenantId: string): Promise<TenantFinances> {
    const tenant = await this.requireProfile(tenantId);
    return this.repository.getFinances(tenantId, tenant.currency, TENANT_OVERVIEW_ROW_LIMIT);
  }

  async audit(tenantId: string): Promise<TenantAuditEntry[]> {
    await this.requireProfile(tenantId);
    return this.repository.listAudit(tenantId, TENANT_AUDIT_LIMIT);
  }

  private async requireProfile(tenantId: string): Promise<TenantProfile> {
    const profile = await this.repository.findProfile(tenantId);
    if (!profile) throw new NotFoundDomainError(`Entreprise introuvable: ${tenantId}`);
    return profile;
  }
}
