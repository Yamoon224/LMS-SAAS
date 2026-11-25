/** Appelle la Route Handler locale /api/auth/activate (jamais l'API backend directement depuis le client). */
export async function activateAccount(token: string, password: string): Promise<void> {
  const response = await fetch("/api/auth/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Lien d'activation invalide ou expiré.");
  }
}
