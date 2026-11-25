import { NextResponse } from "next/server";

import { callChallengeEndpoint } from "@/lib/two-factor-proxy";

/** Enrôlement obligatoire (1/2) : secret, URI otpauth et QR code, sous le défi ENROLL du cookie httpOnly. */
export async function POST(): Promise<NextResponse> {
  const result = await callChallengeEndpoint("/auth/2fa/enrollment/setup");
  if (!result.ok) return result.response;

  const { secret, otpauthUri, qrCodeDataUrl } = result.data;
  return NextResponse.json({ secret, otpauthUri, qrCodeDataUrl });
}
