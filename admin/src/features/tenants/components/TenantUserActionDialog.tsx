"use client";

import { useEffect, useState } from "react";

import type { TenantUser } from "../schemas/tenant-overview.schema";
import { activeOwnersCount, isOwner } from "../schemas/tenant-user-actions";
import type { TenantUserActionKind } from "../schemas/tenant-user-actions";

import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface PendingUserAction {
  kind: TenantUserActionKind;
  user: TenantUser;
}

interface CopyContext {
  user: TenantUser;
  lastActiveOwner: boolean;
}

const COPY: Record<
  TenantUserActionKind,
  { title: (c: CopyContext) => string; description: (c: CopyContext) => string; confirm: string; destructive: boolean }
> = {
  suspend: {
    title: ({ user }) => `Suspendre ${user.fullName} ?`,
    description: ({ user, lastActiveOwner }) =>
      lastActiveOwner
        ? `${user.fullName} est le dernier propriétaire actif : la suspension sera refusée. Transférez d’abord la propriété à un autre compte.`
        : `${user.fullName} ne pourra plus se connecter tant que le compte n’est pas réactivé. Les données sont conservées.`,
    confirm: "Suspendre le compte",
    destructive: true,
  },
  reactivate: {
    title: ({ user }) => `Réactiver ${user.fullName} ?`,
    description: ({ user }) => `${user.fullName} pourra de nouveau se connecter.`,
    confirm: "Réactiver le compte",
    destructive: false,
  },
  resendInvitation: {
    title: ({ user }) => `Renvoyer l’invitation à ${user.fullName} ?`,
    description: ({ user }) =>
      `Un nouveau lien d’activation est envoyé à ${user.email} ; le précédent est révoqué.`,
    confirm: "Renvoyer l’invitation",
    destructive: false,
  },
  passwordReset: {
    title: ({ user }) => `Réinitialiser le mot de passe de ${user.fullName} ?`,
    description: ({ user }) =>
      `Un lien de réinitialisation (valable 1 heure) est envoyé à ${user.email}. Aucun mot de passe n’est affiché ni modifié tant que la personne n’a pas utilisé le lien.`,
    confirm: "Envoyer le lien",
    destructive: false,
  },
  reset2fa: {
    title: ({ user }) => `Réinitialiser la double authentification de ${user.fullName} ?`,
    description: ({ user }) =>
      `La 2FA de ${user.fullName} est effacée et toutes ses sessions sont fermées. Elle devra s’enrôler de nouveau à sa prochaine connexion. À utiliser après vérification de son identité (appareil perdu).`,
    confirm: "Réinitialiser la 2FA",
    destructive: true,
  },
  transferOwnership: {
    title: ({ user }) => `Transférer la propriété à ${user.fullName} ?`,
    description: ({ user }) =>
      `${user.fullName} devient propriétaire de l’entreprise (accès complet, 2FA obligatoire). Les propriétaires actuels perdent ce rôle et deviennent gestionnaires.`,
    confirm: "Transférer la propriété",
    destructive: true,
  },
};

/** ADM-06 : confirmation unique pour toutes les actions sur un compte ; le transfert exige une case de confirmation. */
export function TenantUserActionDialog({
  pending,
  users,
  isPending,
  onCancel,
  onConfirm,
}: {
  pending: PendingUserAction | null;
  users: TenantUser[];
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (action: PendingUserAction) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => setAcknowledged(false), [pending]);

  const copy = pending ? COPY[pending.kind] : null;
  const context: CopyContext | null = pending
    ? { user: pending.user, lastActiveOwner: isOwner(pending.user) && activeOwnersCount(users) <= 1 }
    : null;
  const needsAck = pending?.kind === "transferOwnership";

  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => !open && onCancel()}
      title={copy && context ? copy.title(context) : ""}
      description={copy && context ? copy.description(context) : ""}
      confirmLabel={copy?.confirm ?? "Confirmer"}
      destructive={copy?.destructive ?? false}
      isPending={isPending}
      confirmDisabled={needsAck && !acknowledged}
      onConfirm={() => pending && onConfirm(pending)}
    >
      {needsAck && (
        <div className="flex items-start gap-2 text-sm">
          <Checkbox
            id="ownership-transfer-ack"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <label htmlFor="ownership-transfer-ack">Je confirme ce transfert de propriété.</label>
        </div>
      )}
    </ConfirmDialog>
  );
}
