import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";

/** État « accès non autorisé » (permission manquante), à la place d'une bannière 403 brute. */
export function Forbidden({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={ShieldAlert}
      message={message ?? "Accès non autorisé : votre rôle ne vous permet pas de consulter cette section. Contactez le Propriétaire de votre entreprise."}
    />
  );
}
