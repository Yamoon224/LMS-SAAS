import {
  enrollResultSchema,
  enrollmentSchema,
  examAccessSchema,
  moduleAccessSchema,
} from "../schemas/enrollment.schema";
import type { EnrollResult, Enrollment, ModuleAccess } from "../schemas/enrollment.schema";

import { courseDetailSchema } from "@/features/catalogue/schemas/course.schema";
import type { CourseDetail } from "@/features/catalogue/schemas/course.schema";
import { apiClient } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n/locales";

const enc = encodeURIComponent;

export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  return enrollmentSchema.array().parse(await apiClient.get<unknown>("/public/enrollments/my"));
}

export interface EnrollInput {
  courseId: string;
  isOfflinePayment: boolean;
}

export async function enrollInCourse(input: EnrollInput, locale: Locale): Promise<EnrollResult> {
  const data = await apiClient.post<unknown>("/public/enrollments", { ...input, locale });
  return enrollResultSchema.parse(data);
}

export async function fetchModulesAccess(enrollmentId: string, courseId: string): Promise<ModuleAccess[]> {
  const data = await apiClient.get<unknown>(
    `/public/enrollments/${enc(enrollmentId)}/courses/${enc(courseId)}/modules-access`,
  );
  return moduleAccessSchema.array().parse(data);
}

export async function fetchExamAccess(enrollmentId: string, courseId: string): Promise<boolean> {
  const data = await apiClient.get<unknown>(
    `/public/enrollments/${enc(enrollmentId)}/courses/${enc(courseId)}/exam-access`,
  );
  return examAccessSchema.parse(data).canAccess;
}

/** Fiche formation publique, lue côté client (titres des inscriptions du tableau de bord). */
export async function fetchCourse(courseId: string): Promise<CourseDetail> {
  return courseDetailSchema.parse(await apiClient.get<unknown>(`/public/courses/${enc(courseId)}`));
}
