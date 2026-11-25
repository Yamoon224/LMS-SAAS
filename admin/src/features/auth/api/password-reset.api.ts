async function postJson(url: string, body: unknown, fallbackMessage: string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? fallbackMessage);
  }
}

/** Réponse identique que le compte existe ou non : l'appelant n'apprend rien (anti-énumération). */
export function requestPasswordReset(email: string): Promise<void> {
  return postJson("/api/auth/forgot-password", { email }, "La demande n'a pas pu être envoyée.");
}

export function resetPassword(token: string, password: string): Promise<void> {
  return postJson("/api/auth/reset-password", { token, password }, "Lien invalide ou expiré.");
}
