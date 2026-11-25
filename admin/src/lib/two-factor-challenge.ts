import "server-only";

import { cookies } from "next/headers";

/**
 * Jeton de défi 2FA (5 min, usage unique) renvoyé par le backend après un mot de passe valide. Il est gardé dans
 * un cookie httpOnly limité aux routes /api/auth : le navigateur (JS) ne le voit jamais, et AUCUN cookie de
 * session n'existe tant que la vérification n'est pas complète.
 */
const CHALLENGE_COOKIE = "admin_2fa_challenge";
const CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

export async function setChallengeCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

export async function getChallengeToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CHALLENGE_COOKIE)?.value;
}

export async function clearChallengeCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: CHALLENGE_COOKIE, path: "/api/auth" });
}
