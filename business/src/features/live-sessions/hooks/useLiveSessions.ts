import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelLiveSession,
  fetchLiveSessions,
  fetchSessionAttendance,
  markSessionAttendance,
  scheduleLiveSession,
  setLiveSessionReplay,
} from "../api/live-sessions.api";
import type { ScheduleLiveSessionValues, SetReplayUrlValues } from "../schemas/live-session.schema";

export function liveSessionsQueryKey(courseId: string) {
  return ["live-sessions", courseId] as const;
}

/** Calendrier des sessions live d'une formation (ENT-52/ENT-58). */
export function useLiveSessions(courseId: string) {
  return useQuery({
    queryKey: liveSessionsQueryKey(courseId),
    queryFn: () => fetchLiveSessions(courseId),
    enabled: Boolean(courseId),
  });
}

/** Planifier / annuler / déposer le replay (ENT-52, ENT-56, ENT-57) + invalidation du calendrier de la formation. */
export function useLiveSessionActions(courseId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: liveSessionsQueryKey(courseId) });

  const schedule = useMutation({
    meta: { successMessage: "Session planifiée." },
    mutationFn: (values: ScheduleLiveSessionValues) => scheduleLiveSession(courseId, values),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    meta: { successMessage: "Session annulée." },
    mutationFn: (liveSessionId: string) => cancelLiveSession(liveSessionId),
    onSuccess: invalidate,
  });

  const setReplay = useMutation({
    meta: { successMessage: "Replay enregistré." },
    mutationFn: ({ liveSessionId, values }: { liveSessionId: string; values: SetReplayUrlValues }) =>
      setLiveSessionReplay(liveSessionId, values),
    onSuccess: invalidate,
  });

  return { schedule, cancel, setReplay };
}

/** Inscrits d'une session et leur présence (ENT-57), chargés à l'ouverture du pointage. */
export function useSessionAttendance(liveSessionId: string | null) {
  return useQuery({
    queryKey: ["live-sessions", "attendance", liveSessionId] as const,
    queryFn: () => fetchSessionAttendance(liveSessionId as string),
    enabled: Boolean(liveSessionId),
  });
}

/** Pointage manuel présent/absent d'un inscrit, puis rechargement de la liste. */
export function useMarkAttendance(liveSessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Présence enregistrée." },
    mutationFn: ({ userId, present }: { userId: string; present: boolean }) =>
      markSessionAttendance(liveSessionId as string, userId, present),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["live-sessions", "attendance", liveSessionId] }),
  });
}
