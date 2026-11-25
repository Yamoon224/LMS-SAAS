import type {
  AttendeeStatus,
  LiveSessionItem,
  ScheduleLiveSessionValues,
  SessionAttendee,
  SetReplayUrlValues,
} from "../schemas/live-session.schema";
import { liveSessionItemSchema, sessionAttendeeSchema, toScheduleBody } from "../schemas/live-session.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/live-sessions/courses/:courseId (ListLiveSessionsUseCase) — calendrier d'une formation. */
export async function fetchLiveSessions(courseId: string): Promise<LiveSessionItem[]> {
  const data = await apiClient.get<unknown[]>(`/business/live-sessions/courses/${courseId}`);
  return liveSessionItemSchema.array().parse(data);
}

export interface ScheduleLiveSessionResponse {
  id: string;
  meetLink: string | null;
  status: string;
}

/** POST /business/live-sessions/courses/:courseId — crée l'événement Google Meet et invite les inscrits (ENT-52/ENT-53). */
export async function scheduleLiveSession(
  courseId: string,
  values: ScheduleLiveSessionValues,
): Promise<ScheduleLiveSessionResponse> {
  return apiClient.post<ScheduleLiveSessionResponse, ReturnType<typeof toScheduleBody>>(
    `/business/live-sessions/courses/${courseId}`,
    toScheduleBody(values),
  );
}

/** POST /business/live-sessions/:id/cancel (ENT-56). */
export async function cancelLiveSession(liveSessionId: string): Promise<{ liveSessionId: string }> {
  return apiClient.post<{ liveSessionId: string }>(`/business/live-sessions/${liveSessionId}/cancel`);
}

/** POST /business/live-sessions/:id/replay (ENT-57). */
export async function setLiveSessionReplay(
  liveSessionId: string,
  values: SetReplayUrlValues,
): Promise<{ liveSessionId: string }> {
  return apiClient.post<{ liveSessionId: string }, SetReplayUrlValues>(
    `/business/live-sessions/${liveSessionId}/replay`,
    values,
  );
}

/** GET /business/live-sessions/:id/attendance — inscrits et présence (ENT-57). */
export async function fetchSessionAttendance(liveSessionId: string): Promise<SessionAttendee[]> {
  const data = await apiClient.get<unknown[]>(`/business/live-sessions/${liveSessionId}/attendance`);
  return sessionAttendeeSchema.array().parse(data);
}

/** POST /business/live-sessions/:id/attendance — pointage manuel présent/absent (ENT-57). */
export async function markSessionAttendance(
  liveSessionId: string,
  userId: string,
  present: boolean,
): Promise<{ status: AttendeeStatus }> {
  return apiClient.post<{ status: AttendeeStatus }, { userId: string; present: boolean }>(
    `/business/live-sessions/${liveSessionId}/attendance`,
    { userId, present },
  );
}
