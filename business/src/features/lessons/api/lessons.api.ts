import type { CreateLessonValues, LessonDetail, LessonListItem, UpdateLessonValues } from "../schemas/lesson.schema";
import { lessonDetailSchema, lessonListItemSchema } from "../schemas/lesson.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/modules/:moduleId/lessons (ListLessonsUseCase) — PUB-09. */
export async function fetchLessons(moduleId: string): Promise<LessonListItem[]> {
  const data = await apiClient.get<unknown[]>(`/business/modules/${moduleId}/lessons`);
  return lessonListItemSchema.array().parse(data);
}

export interface CreateLessonResponse {
  id: string;
  order: number;
}

/** POST /business/modules/:moduleId/lessons (CreateLessonUseCase) — ENT-23/ENT-24. */
export async function createLesson(
  moduleId: string,
  values: CreateLessonValues,
): Promise<CreateLessonResponse> {
  return apiClient.post<CreateLessonResponse, CreateLessonValues>(
    `/business/modules/${moduleId}/lessons`,
    values,
  );
}

export interface UpdateLessonResponse {
  id: string;
}

/** PUT /business/modules/:moduleId/lessons/:lessonId (UpdateLessonUseCase) — ENT-23/ENT-25. */
export async function updateLesson(
  moduleId: string,
  lessonId: string,
  values: UpdateLessonValues,
): Promise<UpdateLessonResponse> {
  return apiClient.put<UpdateLessonResponse, UpdateLessonValues>(
    `/business/modules/${moduleId}/lessons/${lessonId}`,
    values,
  );
}

export interface DeleteLessonResponse {
  id: string;
  deleted: boolean;
}

/** DELETE /business/modules/:moduleId/lessons/:lessonId (DeleteLessonUseCase). */
export async function deleteLesson(moduleId: string, lessonId: string): Promise<DeleteLessonResponse> {
  return apiClient.delete<DeleteLessonResponse>(`/business/modules/${moduleId}/lessons/${lessonId}`);
}

export interface ReorderLessonsResponse {
  moduleId: string;
  order: string[];
}

/** PUT /business/modules/:moduleId/lessons/reorder (ReorderLessonsUseCase) — ENT-22. */
export async function reorderLessons(
  moduleId: string,
  orderedIds: string[],
): Promise<ReorderLessonsResponse> {
  return apiClient.put<ReorderLessonsResponse, { orderedIds: string[] }>(
    `/business/modules/${moduleId}/lessons/reorder`,
    { orderedIds },
  );
}

/** GET /business/modules/:moduleId/lessons/:lessonId : fiche d'édition (contenu, critère, média). */
export async function fetchLesson(moduleId: string, lessonId: string): Promise<LessonDetail> {
  const data = await apiClient.get<unknown>(`/business/modules/${moduleId}/lessons/${lessonId}`);
  return lessonDetailSchema.parse(data);
}

/** DELETE /business/modules/:moduleId/lessons/:lessonId/media : retire le fichier et libère le stockage (ENT-24). */
export async function removeLessonMedia(moduleId: string, lessonId: string): Promise<{ id: string }> {
  return apiClient.delete<{ id: string }>(`/business/modules/${moduleId}/lessons/${lessonId}/media`);
}
