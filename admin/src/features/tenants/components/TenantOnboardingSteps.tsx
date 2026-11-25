"use client";

import { Check, CircleDashed, Mail, Minus, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { useTenantInvitations } from "../hooks/useTenantOverview";
import type { TenantInvitation } from "../schemas/tenant-overview.schema";
import type { Tenant } from "../schemas/tenant.schema";

import { TenantInvitationDialog } from "./TenantInvitationDialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/features/session/hooks/useSession";
import { useTenantSubscription } from "@/features/subscriptions/hooks/useTenantSubscription";
import { cn } from "@/lib/utils";

type StepState = "done" | "todo" | "warning" | "unknown";

interface Step {
  label: string;
  detail: string;
  state: StepState;
  action?: React.ReactNode;
}

const STATE_STYLES: Record<StepState, { icon: typeof Check; className: string; srLabel: string }> = {
  done: { icon: Check, className: "bg-success/15 text-success", srLabel: "Terminée" },
  todo: { icon: CircleDashed, className: "bg-surface-muted text-muted-foreground", srLabel: "À faire" },
  warning: { icon: TriangleAlert, className: "bg-warning/15 text-warning", srLabel: "Attention" },
  unknown: { icon: Minus, className: "bg-surface-muted text-muted-foreground", srLabel: "Non vérifiable" },
};

/** Étape « Propriétaire invité / activé » : déduite de l'état réel du lien d'activation du/des propriétaire(s). */
function ownerStep(invitations: TenantInvitation[] | undefined, isLoading: boolean, isError: boolean): Omit<Step, "action"> {
  const label = "Propriétaire invité / activé";
  if (isLoading) return { label, detail: "Vérification…", state: "unknown" };
  if (isError || !invitations) return { label, detail: "Impossible de vérifier l’invitation.", state: "unknown" };
  if (invitations.length === 0) return { label, detail: "Aucun propriétaire rattaché à l’entreprise.", state: "warning" };
  if (invitations.some((invitation) => invitation.state === "ACTIVATED")) {
    return { label, detail: "Le propriétaire a activé son compte.", state: "done" };
  }
  if (invitations.some((invitation) => invitation.state === "PENDING")) {
    return { label, detail: "Invitation envoyée ; le propriétaire n’a pas encore activé son compte.", state: "todo" };
  }
  if (invitations.some((invitation) => invitation.state === "EXPIRED")) {
    return { label, detail: "Le lien d’invitation a expiré : renvoyez les accès depuis l’onglet Utilisateurs.", state: "warning" };
  }
  return { label, detail: "Compte créé avec un mot de passe : aucune invitation à envoyer.", state: "done" };
}

/** Parcours de mise en service, dérivé des données disponibles : statut du tenant, abonnement et invitation du propriétaire. */
export function TenantOnboardingSteps({ tenant }: { tenant: Tenant }) {
  const { can } = usePermissions();
  const canSeeSubscription = can("subscriptions.assign");
  const subscription = useTenantSubscription(canSeeSubscription ? tenant.id : "");
  const invitations = useTenantInvitations(tenant.id);
  const [invitationOpen, setInvitationOpen] = useState(false);

  const activation: Step =
    tenant.status === "ACTIVE"
      ? { label: "Activée", detail: "Les accès de l’entreprise sont ouverts.", state: "done" }
      : tenant.status === "SUSPENDED"
        ? { label: "Activée", detail: "Suspendue : réactivez-la pour rouvrir ses accès.", state: "warning" }
        : tenant.status === "DRAFT"
          ? { label: "Activée", detail: "En brouillon : activez-la pour ouvrir ses accès.", state: "todo" }
          : { label: "Activée", detail: "Entreprise archivée.", state: "unknown" };

  const subscriptionStep: Step = !canSeeSubscription
    ? { label: "Abonnement attribué", detail: "Non vérifiable avec votre rôle.", state: "unknown" }
    : subscription.isLoading
      ? { label: "Abonnement attribué", detail: "Vérification…", state: "unknown" }
      : subscription.isError
        ? { label: "Abonnement attribué", detail: "Impossible de vérifier l’abonnement.", state: "unknown" }
        : subscription.data
          ? { label: "Abonnement attribué", detail: `${subscription.data.planName} (${subscription.data.status === "TRIALING" ? "essai" : "attribué"}).`, state: "done" }
          : { label: "Abonnement attribué", detail: "Aucun abonnement : attribuez un plan.", state: "todo" };

  const steps: Step[] = [
    { label: "Créée", detail: "L’entreprise et son compte Propriétaire existent.", state: "done" },
    activation,
    subscriptionStep,
    {
      ...ownerStep(invitations.data, invitations.isLoading, invitations.isError),
      action: (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setInvitationOpen(true)}>
          <Mail className="h-4 w-4" aria-hidden="true" /> Consulter l’invitation
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mise en service</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const style = STATE_STYLES[step.state];
            const Icon = style.icon;
            return (
              <li key={step.label} className="flex items-start gap-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", style.className)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{style.srLabel}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {index + 1}. {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                  {step.action}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
      <TenantInvitationDialog tenantId={tenant.id} open={invitationOpen} onOpenChange={setInvitationOpen} />
    </Card>
  );
}
