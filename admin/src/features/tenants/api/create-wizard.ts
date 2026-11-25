import type { WizardValues } from "../schemas/wizard.schema";

import { activateTenant, createTenant, updateTenant, updateTenantBranding } from "./tenants.api";

import { setCommissionRule } from "@/features/commission-rules/api/commission-rules.api";
import { assignSubscription } from "@/features/subscriptions/api/subscriptions.api";

/** Ce que l'utilisateur est autorisé à configurer ; les étapes non permises sont ignorées. */
export interface WizardCapabilities {
  editTenant: boolean;
  assignPlan: boolean;
  setCommission: boolean;
  activate: boolean;
}

export interface WizardStepResult {
  label: string;
  ok: boolean;
  error?: string;
}

export interface WizardOutcome {
  tenant: { id: string; slug: string };
  results: WizardStepResult[];
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Échec de l’opération.";
}

async function run(label: string, action: () => Promise<unknown>): Promise<WizardStepResult> {
  try {
    await action();
    return { label, ok: true };
  } catch (error) {
    return { label, ok: false, error: messageOf(error) };
  }
}

/**
 * Crée l'entreprise puis applique, une par une, les configurations demandées. La création est la seule étape
 * bloquante (elle lève en cas d'échec) ; les suivantes sont indépendantes : l'une qui échoue n'annule ni
 * l'entreprise ni les autres, et son erreur est restituée pour être corrigée depuis la fiche.
 */
export async function createTenantFromWizard(values: WizardValues, can: WizardCapabilities): Promise<WizardOutcome> {
  const created = await createTenant({
    name: values.name,
    slug: values.slug,
    country: values.country,
    currency: values.currency,
    defaultLocale: values.defaultLocale,
    owner: values.owner,
  });
  const results: WizardStepResult[] = [{ label: "Entreprise et compte Propriétaire créés", ok: true }];

  if (can.editTenant && (values.contactEmail || values.contactPhone)) {
    results.push(
      await run("Contacts enregistrés", () =>
        updateTenant(created.id, {
          name: values.name,
          country: values.country,
          currency: values.currency,
          defaultLocale: values.defaultLocale,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
        }),
      ),
    );
  }

  if (can.editTenant && (values.logoUrl || values.primaryColor || values.secondaryColor)) {
    results.push(
      await run("Identité visuelle enregistrée", () =>
        updateTenantBranding(created.id, { logoUrl: values.logoUrl, primaryColor: values.primaryColor, secondaryColor: values.secondaryColor }),
      ),
    );
  }

  if (can.assignPlan && values.planPriceId) {
    results.push(
      await run(values.startWithTrial ? "Plan attribué (période d’essai)" : "Plan attribué", () =>
        assignSubscription(created.id, { planPriceId: values.planPriceId, startWithTrial: values.startWithTrial }),
      ),
    );
  }

  if (can.setCommission) {
    const rules = [
      { type: "ONLINE" as const, percent: values.onlineCommission, label: "Commission des ventes en ligne" },
      { type: "OFFLINE" as const, percent: values.offlineCommission, label: "Commission des ventes hors plateforme" },
    ];
    for (const rule of rules) {
      if (rule.percent === "") continue;
      results.push(
        await run(`${rule.label} : ${rule.percent} %`, () =>
          setCommissionRule({ scope: "TENANT", type: rule.type, tenantId: created.id, percentRate: Number(rule.percent) }),
        ),
      );
    }
  }

  if (can.activate && values.activateNow) {
    results.push(await run("Entreprise activée", () => activateTenant(created.id)));
  }

  return { tenant: { id: created.id, slug: created.slug }, results };
}
