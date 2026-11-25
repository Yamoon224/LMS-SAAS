"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const sessionSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
export type SessionInfo = z.infer<typeof sessionSchema>;

async function fetchSession(): Promise<SessionInfo> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (response.status === 401) {
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new Error("Session expirée.");
  }
  if (!response.ok) throw new Error("Session indisponible.");
  return sessionSchema.parse(await response.json());
}

/** Session courante (rôles + permissions du JWT) — UX uniquement, le backend reste l'autorité. */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** `can(code)` : false tant que la session charge (les actions n'apparaissent qu'une fois connues). */
export function usePermissions() {
  const { data, isLoading } = useSession();
  const granted = new Set(data?.permissions ?? []);
  return {
    isLoading,
    session: data,
    can: (code: string) => granted.has(code),
    canAny: (codes: readonly string[]) => codes.some((code) => granted.has(code)),
  };
}
