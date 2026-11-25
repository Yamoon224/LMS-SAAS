export interface TranscodeRequest {
  sourceStorageKey: string;
  /** Préfixe S3 de destination pour le manifeste HLS et les segments multi-débits. */
  outputPrefix: string;
}

export interface TranscodeJobHandle {
  providerJobId: string;
}

export interface TranscodeJobResult {
  status: "IN_PROGRESS" | "COMPLETE" | "ERROR";
  durationSeconds?: number;
  errorMessage?: string;
}

/**
 * Port de transcodage vidéo (section 15.4: "HLS multi-débits : 240p, 360p,
 * 480p, 720p (1080p en option), vignettes"). Implémenté par AWS Elemental
 * MediaConvert en production ; la couche Media est abstraite pour permettre
 * de basculer vers Bunny Stream/Cloudflare Stream si les coûts de diffusion
 * vers l'Afrique s'avèrent trop élevés (section 15.5).
 */
export interface VideoTranscoderPort {
  startTranscoding(request: TranscodeRequest): Promise<TranscodeJobHandle>;
  /** Interrogé par le worker qui traite les notifications de fin de job (BE-08). */
  getJobStatus(providerJobId: string): Promise<TranscodeJobResult>;
}

export const VIDEO_TRANSCODER = Symbol("VIDEO_TRANSCODER");
