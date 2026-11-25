"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clearPosition, computeResumeTime, preloadMode, readPosition, writePosition } from "../lib/resume-position";

import { useCopy } from "@/lib/i18n/client";

interface MediaPlayerProps {
  kind: "VIDEO" | "AUDIO";
  src: string;
  title: string;
  downloadAllowed: boolean;
  /** Pourcentage déjà visionné (reprise du suivi). */
  initialPercent: number;
  /** `<inscription>:<leçon>` : identifie la position de reprise conservée dans le navigateur (PUB-16). */
  positionKey: string;
  /** Envoi (debouncé ici) du pourcentage maximum atteint. */
  onProgress: (percent: number) => void;
  /** URL signée expirée ou illisible : l'appelant recharge la leçon pour obtenir une URL fraîche. */
  onSourceError: () => void;
}

const SEND_INTERVAL_MS = 10_000;
/** Fréquence d'enregistrement de la position de reprise (locale, donc peu coûteuse). */
const SAVE_POSITION_INTERVAL_MS = 5_000;

/**
 * Lecteur natif <video>/<audio> (léger, accessible, aucune dépendance).
 * Suivi : on n'envoie que le maximum atteint, au plus toutes les 10 s, plus un
 * envoi à la pause / fin / fermeture. Sur erreur de source (URL signée expirée),
 * on demande une URL fraîche et on reprend à la position courante.
 */
export function MediaPlayer({
  kind,
  src,
  title,
  downloadAllowed,
  initialPercent,
  positionKey,
  onProgress,
  onSourceError,
}: MediaPlayerProps) {
  const copy = useCopy();
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const maxPercent = useRef(initialPercent);
  const lastSent = useRef(initialPercent);
  const lastSentAt = useRef(0);
  const resumeAt = useRef(0);
  const resumedOnce = useRef(false);
  const lastSavedAt = useRef(0);
  // PUB-16 : mode « économie de données » du navigateur -> aucun préchargement. Lu après l'hydratation.
  const [preload, setPreload] = useState<"metadata" | "none">("metadata");
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setPreload(preloadMode(connection?.saveData === true));
  }, []);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  const flush = useCallback((force: boolean) => {
    const percent = Math.floor(maxPercent.current);
    if (percent <= lastSent.current) return;
    const now = Date.now();
    if (!force && now - lastSentAt.current < SEND_INTERVAL_MS) return;
    lastSent.current = percent;
    lastSentAt.current = now;
    onProgressRef.current(percent);
  }, []);

  // Envoi final au démontage (changement de leçon / fermeture de page).
  useEffect(() => {
    return () => flush(true);
  }, [flush]);

  /** Enregistre la position exacte (au plus toutes les 5 s, ou immédiatement si `force`). */
  function savePosition(force: boolean) {
    const el = ref.current;
    if (!el || el.ended || el.currentTime < 1) return;
    const now = Date.now();
    if (!force && now - lastSavedAt.current < SAVE_POSITION_INTERVAL_MS) return;
    lastSavedAt.current = now;
    writePosition(positionKey, el.currentTime);
  }

  function handleTimeUpdate() {
    const el = ref.current;
    if (!el || !el.duration || !Number.isFinite(el.duration)) return;
    const percent = (el.currentTime / el.duration) * 100;
    if (percent > maxPercent.current) maxPercent.current = percent;
    flush(false);
    savePosition(false);
  }

  function handleError() {
    const el = ref.current;
    if (el) resumeAt.current = el.currentTime;
    onSourceError();
  }

  function handleLoadedMetadata() {
    const el = ref.current;
    if (!el) return;
    if (resumeAt.current > 0) {
      // Rechargement après expiration de l'URL signée : on reprend exactement là où la lecture s'est arrêtée.
      el.currentTime = resumeAt.current;
      resumeAt.current = 0;
      return;
    }
    // PUB-16 : première ouverture de la leçon -> reprise là où l'apprenant s'était arrêté.
    if (resumedOnce.current) return;
    resumedOnce.current = true;
    const target = computeResumeTime({
      localSeconds: readPosition(positionKey),
      serverPercent: initialPercent,
      duration: el.duration,
    });
    if (target > 0) el.currentTime = target;
  }

  const common = {
    ref,
    src,
    controls: true,
    preload,
    controlsList: downloadAllowed ? undefined : "nodownload",
    onTimeUpdate: handleTimeUpdate,
    onPause: () => {
      flush(true);
      savePosition(true);
    },
    onEnded: () => {
      maxPercent.current = 100;
      flush(true);
      // Terminée : la prochaine lecture repart du début.
      clearPosition(positionKey);
    },
    onError: handleError,
    onLoadedMetadata: handleLoadedMetadata,
    "aria-label": title,
  };

  // Les médias de cours n'ont pas de piste de sous-titres exposée par l'API (gap documenté).
  /* eslint-disable jsx-a11y/media-has-caption */
  if (kind === "AUDIO") {
    return (
      <div className="rounded-md border border-line bg-card p-4 shadow-card">
        <audio {...common} className="w-full">
          {copy.player.mediaError}
        </audio>
      </div>
    );
  }
  return (
    <video {...common} playsInline className="aspect-video w-full rounded-md bg-ink shadow-card">
      {copy.player.mediaError}
    </video>
  );
  /* eslint-enable jsx-a11y/media-has-caption */
}
