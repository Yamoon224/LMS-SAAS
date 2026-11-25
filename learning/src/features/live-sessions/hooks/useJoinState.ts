"use client";

import { useEffect, useState } from "react";

import { joinState, msUntilNextJoinChange } from "../lib/join-window";
import type { JoinableSession, JoinState } from "../lib/join-window";

/** État du bouton « Rejoindre », recalculé à l'instant exact où il change (sans interrogation périodique). */
export function useJoinState(session: JoinableSession): JoinState {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (now === null) return;
    const delay = msUntilNextJoinChange(session, now);
    if (delay === null) return;
    // setTimeout est borné à ~24,8 jours : au-delà, on se réveille plus tôt et on recalcule.
    const timer = setTimeout(() => setNow(Date.now()), Math.min(delay + 50, 2_000_000_000));
    return () => clearTimeout(timer);
  }, [session.startAt, session.durationMinutes, session.status, now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avant l'hydratation, on suppose « plus tard » : le bouton n'est jamais actif à tort.
  return now === null ? "later" : joinState(session, now);
}
