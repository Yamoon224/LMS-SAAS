import { apiClient } from "@/lib/api-client";

/** GET /public/me/data-export — toutes mes données personnelles (JSON), limité en débit côté serveur. */
export async function fetchMyDataExport(): Promise<unknown> {
  return apiClient.get<unknown>("/public/me/data-export");
}

/** POST /public/me/delete-account — anonymisation irréversible du compte, confirmée par le mot de passe. */
export async function deleteMyAccount(password: string): Promise<void> {
  await apiClient.post<unknown, { password: string }>("/public/me/delete-account", { password });
}

/** POST /api/auth/logout — ferme la session locale (cookies) ; le compte supprimé n'a de toute façon plus de jeton valide. */
export async function closeLocalSession(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}
