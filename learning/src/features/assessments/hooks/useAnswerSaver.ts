"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveAnswer } from "../api/assessments.api";

export type SaveState = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 600;
const RETRY_MS = 3000;

/**
 * Enregistrement des réponses au fil de l'eau : debounce 600 ms, une file de
 * réponses en attente (dernière valeur par question), nouvel essai automatique
 * toutes les 3 s en cas d'échec. `flush()` vide la file (à attendre avant l'envoi final).
 */
export function useAnswerSaver(attemptId: string) {
  const pending = useRef(new Map<string, string[]>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const [state, setState] = useState<SaveState>("idle");

  const run = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) await inFlight.current;
    if (pending.current.size === 0) return true;
    const batch = new Map(pending.current);
    pending.current.clear();
    setState("saving");
    const task = (async () => {
      try {
        for (const [questionId, options] of batch) await saveAnswer(attemptId, questionId, options);
        return true;
      } catch {
        // on remet en file sans écraser une valeur plus récente
        for (const [questionId, options] of batch) if (!pending.current.has(questionId)) pending.current.set(questionId, options);
        return false;
      }
    })();
    inFlight.current = task;
    const ok = await task;
    inFlight.current = null;
    if (ok) {
      setState(pending.current.size > 0 ? "saving" : "saved");
      if (pending.current.size > 0) timer.current = setTimeout(() => void run(), DEBOUNCE_MS);
    } else {
      setState("error");
      timer.current = setTimeout(() => void run(), RETRY_MS);
    }
    return ok;
  }, [attemptId]);

  const queue = useCallback(
    (questionId: string, selectedOptionIds: string[]) => {
      pending.current.set(questionId, selectedOptionIds);
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void run(), DEBOUNCE_MS);
    },
    [run],
  );

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    let ok = await run();
    if (!ok) ok = await run();
    return ok && pending.current.size === 0;
  }, [run]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** Réponses non enregistrées (pour avertir avant de quitter la page). */
  const hasPending = useCallback(() => pending.current.size > 0 || inFlight.current !== null, []);

  return { state, queue, flush, hasPending };
}
