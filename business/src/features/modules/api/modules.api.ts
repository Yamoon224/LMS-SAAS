import type { CourseModuleItem, CreateModuleValues, UpdateModuleValues } from "../schemas/module.schema";
import { courseModuleSchema } from "../schemas/module.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/courses/:courseId/modules (ListModulesUseCase) — ENT-22/PUB-03. */
export async function fetchModules(courseId: string): Promise<CourseModuleItem[]> {
  const data = await apiClient.get<unknown[]>(`/business/courses/${courseId}/modules`);
  return courseModuleSchema.array().parse(data);
}

export interface CreateModuleResponse {
  id: string;
  order: number;
}

/** POST /business/courses/:courseId/modules (CreateModuleUseCase) — ENT-22. */
export async function createModule(
  courseId: string,
  values: CreateModuleValues,
): Promise<CreateModuleResponse> {
  return apiClient.post<CreateModuleResponse, CreateModuleValues>(
    `/business/courses/${courseId}/modules`,
    values,
  );
}

export interface UpdateModuleResponse {
  id: string;
}

/** PUT /business/courses/:courseId/modules/:moduleId (UpdateModuleUseCase) — ENT-22. */
export async function updateModule(
  courseId: string,
  moduleId: string,
  values: UpdateModuleValues,
): Promise<UpdateModuleResponse> {
  return apiClient.put<UpdateModuleResponse, UpdateModuleValues>(
    `/business/courses/${courseId}/modules/${moduleId}`,
    values,
  );
}

export interface DeleteModuleResponse {
  id: string;
  deleted: boolean;
}

/** DELETE /business/courses/:courseId/modules/:moduleId (DeleteModuleUseCase) — ENT-22. */
export async function deleteModule(courseId: string, moduleId: string): Promise<DeleteModuleResponse> {
  return apiClient.delete<DeleteModuleResponse>(`/business/courses/${courseId}/modules/${moduleId}`);
}

export interface ReorderModulesResponse {
  courseId: string;
  order: string[];
}

/** PUT /business/courses/:courseId/modules/reorder (ReorderModulesUseCase) — ENT-22. */
export async function reorderModules(
  courseId: string,
  orderedIds: string[],
): Promise<ReorderModulesResponse> {
  return apiClient.put<ReorderModulesResponse, { orderedIds: string[] }>(
    `/business/courses/${courseId}/modules/reorder`,
    { orderedIds },
  );
}
