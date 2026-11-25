"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { updateLesson } from "../api/lessons.api";
import { abandonUpload, confirmUpload, requestUpload } from "../api/media.api";
import { UploadAbortedError, uploadFileToUrl } from "../lib/upload-file";
import type { ResourceType } from "../schemas/lesson.schema";
import { validateMediaFile } from "../schemas/media.schema";

import { lessonQueryKey } from "./useLesson";

import { ApiError } from "@/lib/api-client";

export type UploadPhase = "idle" | "uploading" | "finalizing" | "error";

interface UploadParams {
  moduleId: string;
  lessonId: string;
  resourceType: ResourceType;
  downloadAllowed: boolean;
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Le téléversement a échoué.";
}

/**
 * Téléversement d'un fichier de leçon (ENT-24) : contrôle local du type et de la taille, demande d'URL présignée,
 * envoi direct avec progression et annulation, confirmation, puis rattachement à la leçon. Un échec ou une annulation
 * après la demande d'URL supprime le média abandonné (libère le quota).
 */
export function useMediaUpload({ moduleId, lessonId, resourceType, downloadAllowed }: UploadParams) {
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (file: File) => {
      const invalid = validateMediaFile(file, resourceType);
      if (invalid) {
        setPhase("error");
        setError(invalid);
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setError(null);
      setPercent(0);
      setPhase("uploading");
      let mediaAssetId: string | null = null;
      try {
        const request = await requestUpload({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          downloadAllowed,
        });
        mediaAssetId = request.mediaAssetId;
        await uploadFileToUrl(request.uploadUrl, file, request.requiredHeaders, setPercent, controller.signal);
        setPhase("finalizing");
        await confirmUpload(request.mediaAssetId);
        await updateLesson(moduleId, lessonId, { storageUrl: request.mediaAssetId, downloadAllowed });
        await queryClient.invalidateQueries({ queryKey: lessonQueryKey(moduleId, lessonId) });
        setPhase("idle");
      } catch (failure) {
        if (mediaAssetId) await abandonUpload(mediaAssetId).catch(() => undefined);
        if (failure instanceof UploadAbortedError) {
          setPhase("idle");
          return;
        }
        setPhase("error");
        setError(describeFailure(failure));
      } finally {
        controllerRef.current = null;
      }
    },
    [downloadAllowed, lessonId, moduleId, queryClient, resourceType],
  );

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { phase, percent, error, start, cancel, isBusy: phase === "uploading" || phase === "finalizing" };
}
