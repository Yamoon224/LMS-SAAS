"use client";

import { Mail } from "lucide-react";

import { useTenantInvitations } from "../hooks/useTenantOverview";
import { INVITATION_STATE_LABELS, INVITATION_STATE_VARIANTS } from "../schemas/tenant-overview.schema";
import type { TenantInvitation } from "../schemas/tenant-overview.schema";

import { TenantTabState } from "./TenantTabState";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

const DELIVERY_LABELS: Record<string, string> = {
  PENDING: "En file d’envoi",
  SENT: "Envoyé",
  FAILED: "Échec d’envoi",
  READ: "Lu",
};

function InvitationCard({ invitation }: { invitation: TenantInvitation }) {
  const { recipient, message } = invitation;

  return (
    <article className="flex flex-col gap-3 rounded-md border border-border p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium">{recipient.fullName}</p>
          <p className="break-all text-xs text-muted-foreground">{recipient.email}</p>
        </div>
        <Badge variant={INVITATION_STATE_VARIANTS[invitation.state]}>{INVITATION_STATE_LABELS[invitation.state]}</Badge>
      </header>

      {invitation.state === "NOT_INVITED" ? (
        <p className="text-sm text-muted-foreground">
          Ce compte a été créé avec un mot de passe défini par l’Admin : aucune invitation n’a été envoyée.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Émise le</dt>
            <dd>{formatDateTime(invitation.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expire le</dt>
            <dd>{formatDateTime(invitation.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Activée le</dt>
            <dd>{formatDateTime(invitation.consumedAt)}</dd>
          </div>
        </dl>
      )}

      {message && (
        <section aria-label="E-mail envoyé" className="flex flex-col gap-2 rounded-md bg-surface-muted p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" /> E-mail à {recipient.email}
            </span>
            <Badge variant={message.status === "FAILED" ? "danger" : message.status === "SENT" ? "success" : "secondary"}>
              {DELIVERY_LABELS[message.status] ?? message.status}
            </Badge>
          </div>
          <p className="font-medium">{message.subject}</p>
          <p className="whitespace-pre-wrap break-words text-muted-foreground">{message.body}</p>
          {message.sentAt && <p className="text-xs text-muted-foreground">Envoyé le {formatDateTime(message.sentAt)}</p>}
          {message.errorMessage && (
            <p role="alert" className="break-words text-xs text-danger">
              {message.errorMessage}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Le jeton du lien d’activation est masqué : il donne accès au compte.</p>
        </section>
      )}
    </article>
  );
}

/** ADM-10 : consulte l'invitation envoyée au(x) propriétaire(s) à la création de l'entreprise. */
export function TenantInvitationDialog({ tenantId, open, onOpenChange }: { tenantId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const query = useTenantInvitations(tenantId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invitation envoyée au propriétaire</DialogTitle>
          <DialogDescription>État du lien d’activation et e-mail tel qu’il a été envoyé à la création de l’entreprise.</DialogDescription>
        </DialogHeader>
        <TenantTabState
          query={query}
          errorTitle="Impossible de charger l’invitation."
          forbiddenMessage="Vous n’avez pas l’autorisation de consulter cette invitation."
        >
          {(invitations) =>
            invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun propriétaire rattaché à cette entreprise.</p>
            ) : (
              <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
                {invitations.map((invitation) => (
                  <InvitationCard key={invitation.recipient.userId} invitation={invitation} />
                ))}
              </div>
            )
          }
        </TenantTabState>
      </DialogContent>
    </Dialog>
  );
}
