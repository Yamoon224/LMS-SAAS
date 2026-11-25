import type { MediaView, UploadRequestResponse } from "../schemas/media.schema";
import { mediaViewSchema, uploadRequestResponseSchema } from "../schemas/media.schema";

import { apiClient } from "@/lib/api-client";

export interface UploadRequestValues {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadAllowed: boolean;
}

/** POST /business/media/upload-request : URL présignée (le fichier ne transite pas par l'API, section 12). */
export async function requestUpload(values: UploadRequestValues): Promise<UploadRequestResponse> {
  const data = await apiClient.post<unknown, UploadRequestValues>("/business/media/upload-request", values);
  return uploadRequestResponseSchema.parse(data);
}

/** POST /business/media/:id/confirm : fin du PUT (analyse antivirus, puis transcodage pour une vidéo). */
export async function confirmUpload(mediaAssetId: string): Promise<void> {
  await apiClient.post(`/business/media/${mediaAssetId}/confirm`);
}

/** GET /business/media/:id : état du média (en transcodage, prêt, échec...). */
export async function fetchMediaStatus(mediaAssetId: string): Promise<MediaView> {
  const data = await apiClient.get<unknown>(`/business/media/${mediaAssetId}`);
  return mediaViewSchema.parse(data);
}

/** DELETE /business/media/:id : annule un téléversement en cours ou échoué. */
export async function abandonUpload(mediaAssetId: string): Promise<void> {
  await apiClient.delete(`/business/media/${mediaAssetId}`);
}
