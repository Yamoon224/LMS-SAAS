"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchLiveSessions, recordLiveSessionJoin, registerForLiveSession } from "../api/live-sessions.api";

export function useLiveSessions(courseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["live-sessions", courseId],
    queryFn: () => fetchLiveSessions(courseId),
    enabled,
  });
}

export function useRegisterForLiveSession() {
  return useMutation({ mutationFn: registerForLiveSession });
}

export function useRecordLiveSessionJoin() {
  return useMutation({ mutationFn: recordLiveSessionJoin });
}
