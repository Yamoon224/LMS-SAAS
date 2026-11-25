import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";

/** État « accès non autorisé » (403 ou permission absente de la session). */
export function AccessDenied({ message = "Vous n’avez pas l’autorisation d’accéder à cette section. Contactez un super administrateur pour obtenir le rôle adapté." }: { message?: string }) {
  return <EmptyState icon={ShieldAlert} message={message} />;
}

export function isForbidden(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { status?: number }).status === 403;
}
