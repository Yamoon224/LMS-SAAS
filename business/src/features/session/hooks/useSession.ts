import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const sessionSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});
export type Session = z.infer<typeof sessionSchema>;

export const sessionQueryKey = ["session"] as const;

async function fetchSession(): Promise<Session> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) throw new Error("Session indisponible.");
  return sessionSchema.parse(await response.json());
}

/**
 * Session courante (userId, rôles, permissions du JWT) via /api/auth/session. UX uniquement :
 * le backend reste l'autorité. Tant que la session charge (ou en cas d'échec), `can()` autorise
 * pour éviter de masquer à tort — un 403 backend resterait affiché proprement.
 */
export function useSession() {
  const query = useQuery({ queryKey: sessionQueryKey, queryFn: fetchSession, staleTime: 5 * 60_000, retry: false });
  const permissions = query.data?.permissions;

  function can(permission?: string): boolean {
    if (!permission) return true;
    if (!permissions) return true;
    return permissions.includes(permission);
  }

  return { session: query.data, isLoading: query.isLoading, can };
}
