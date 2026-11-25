"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Compte à rebours piloté par le serveur : `deadline` et `serverNow` viennent du
 * backend ; le décalage d'horloge client est corrigé une fois à la réception
 * (skew = serverNow - horloge client à la réception). `onExpire` est appelé une fois.
 */
export function useCountdown(deadline: string | null | undefined, serverNow: string, receivedAt: number, onExpire: () => void) {
  const deadlineMs = deadline ? Date.parse(deadline) : null;
  const skew = Date.parse(serverNow) - receivedAt;
  const compute = () => (deadlineMs === null ? null : Math.max(0, deadlineMs - (Date.now() + skew)));
  const [remainingMs, setRemainingMs] = useState<number | null>(compute);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (deadlineMs === null) return;
    const tick = () => {
      const left = Math.max(0, deadlineMs - (Date.now() + skew));
      setRemainingMs(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, skew]);

  return remainingMs;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
