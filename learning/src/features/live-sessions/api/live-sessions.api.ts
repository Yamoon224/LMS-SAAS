import { liveSessionSchema } from "../schemas/live-session.schema";
import type { LiveSession } from "../schemas/live-session.schema";

import { apiClient } from "@/lib/api-client";

const enc = encodeURIComponent;

export async function fetchLiveSessions(courseId: string): Promise<LiveSession[]> {
  const data = await apiClient.get<unknown>(`/public/live-sessions/courses/${enc(courseId)}`);
  return liveSessionSchema.array().parse(data);
}

export function registerForLiveSession(liveSessionId: string): Promise<unknown> {
  return apiClient.post(`/public/live-sessions/${enc(liveSessionId)}/register`);
}

/** Signale la connexion effective (suivi de présence RG-08b), avant d'ouvrir le lien de la session. */
export function recordLiveSessionJoin(liveSessionId: string): Promise<unknown> {
  return apiClient.post(`/public/live-sessions/${enc(liveSessionId)}/join`);
}
