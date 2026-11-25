import type {
  CourseDetail,
  CourseListItem,
  CreateCourseValues,
  UpdateCourseValues,
} from "../schemas/course.schema";
import { courseDetailSchema, courseListItemSchema } from "../schemas/course.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/courses (ListCoursesUseCase.listForTenant) — ENT-15. */
export async function fetchCourses(): Promise<CourseListItem[]> {
  const data = await apiClient.get<unknown[]>("/business/courses");
  return courseListItemSchema.array().parse(data);
}

/** GET /business/courses/:id (GetCourseUseCase) — fiche formation. */
export async function fetchCourseById(id: string): Promise<CourseDetail> {
  const data = await apiClient.get<unknown>(`/business/courses/${id}`);
  return courseDetailSchema.parse(data);
}

export interface CreateCourseResponse {
  id: string;
  status: string;
}

/** POST /business/courses (CreateCourseUseCase) — ENT-15, créée en Brouillon. */
export async function createCourse(values: CreateCourseValues): Promise<CreateCourseResponse> {
  return apiClient.post<CreateCourseResponse, CreateCourseValues>("/business/courses", values);
}

export interface UpdateCourseResponse {
  id: string;
}

/** PUT /business/courses/:id (UpdateCourseUseCase) — ENT-15/ENT-21. */
export async function updateCourse(
  id: string,
  values: UpdateCourseValues,
): Promise<UpdateCourseResponse> {
  return apiClient.put<UpdateCourseResponse, UpdateCourseValues>(`/business/courses/${id}`, values);
}

export interface ChangeCourseStatusResponse {
  id: string;
  status: string;
}

/** POST /business/courses/:id/publish (ChangeCourseStatusUseCase.publish) — ENT-18. */
export async function publishCourse(id: string): Promise<ChangeCourseStatusResponse> {
  return apiClient.post<ChangeCourseStatusResponse>(`/business/courses/${id}/publish`);
}

/** POST /business/courses/:id/hide — ENT-18 (accès des inscrits conservé). */
export async function hideCourse(id: string): Promise<ChangeCourseStatusResponse> {
  return apiClient.post<ChangeCourseStatusResponse>(`/business/courses/${id}/hide`);
}

/** POST /business/courses/:id/archive — ENT-18 (état terminal). */
export async function archiveCourse(id: string): Promise<ChangeCourseStatusResponse> {
  return apiClient.post<ChangeCourseStatusResponse>(`/business/courses/${id}/archive`);
}

export interface DuplicateCourseResponse {
  id: string;
  status: string;
}

/** POST /business/courses/:id/duplicate (DuplicateCourseUseCase) — ENT-20. */
export async function duplicateCourse(id: string): Promise<DuplicateCourseResponse> {
  return apiClient.post<DuplicateCourseResponse>(`/business/courses/${id}/duplicate`);
}
