import type {
  EnrollmentDetail,
  EnrollmentListItem,
  EnrollmentStatus,
  ExtendAccessValues,
  ManualEnrollmentValues,
  RejectOfflinePaymentValues,
  ValidateOfflinePaymentValues,
} from "../schemas/enrollment.schema";
import { enrollmentDetailSchema, enrollmentListItemSchema, toManualEnrollmentBody } from "../schemas/enrollment.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/enrollments?courseId=... (ListEnrollmentsUseCase.listForCourse) — ENT-60. */
export async function fetchEnrollments(
  courseId: string,
  status?: EnrollmentStatus,
): Promise<EnrollmentListItem[]> {
  const query = status ? `?courseId=${courseId}&status=${status}` : `?courseId=${courseId}`;
  const data = await apiClient.get<unknown[]>(`/business/enrollments${query}`);
  return enrollmentListItemSchema.array().parse(data);
}

/** GET /business/enrollments/:enrollmentId (GetEnrollmentUseCase) — fiche d'inscription. */
export async function fetchEnrollmentById(enrollmentId: string): Promise<EnrollmentDetail> {
  const data = await apiClient.get<unknown>(`/business/enrollments/${enrollmentId}`);
  return enrollmentDetailSchema.parse(data);
}

export interface ValidateOfflinePaymentResponse {
  enrollmentId: string;
  validated: boolean;
}

/** POST /business/enrollments/:enrollmentId/validate-offline-payment (ENT-61/RG-07). */
export async function validateOfflinePayment(
  enrollmentId: string,
  values: ValidateOfflinePaymentValues,
): Promise<ValidateOfflinePaymentResponse> {
  return apiClient.post<ValidateOfflinePaymentResponse, ValidateOfflinePaymentValues>(
    `/business/enrollments/${enrollmentId}/validate-offline-payment`,
    values,
  );
}

export interface ManageEnrollmentResponse {
  enrollmentId: string;
  status: string;
}

/** POST /business/enrollments/:enrollmentId/suspend (ENT-64). */
export async function suspendEnrollment(enrollmentId: string): Promise<ManageEnrollmentResponse> {
  return apiClient.post<ManageEnrollmentResponse>(`/business/enrollments/${enrollmentId}/suspend`);
}

/** POST /business/enrollments/:enrollmentId/reactivate (ENT-64). */
export async function reactivateEnrollment(enrollmentId: string): Promise<ManageEnrollmentResponse> {
  return apiClient.post<ManageEnrollmentResponse>(`/business/enrollments/${enrollmentId}/reactivate`);
}

export interface ExtendAccessResponse {
  enrollmentId: string;
}

/** POST /business/enrollments/:enrollmentId/extend-access (ENT-64). */
export async function extendEnrollmentAccess(
  enrollmentId: string,
  values: ExtendAccessValues,
): Promise<ExtendAccessResponse> {
  return apiClient.post<ExtendAccessResponse, ExtendAccessValues>(
    `/business/enrollments/${enrollmentId}/extend-access`,
    values,
  );
}

export interface ResetProgressResponse {
  enrollmentId: string;
  reset: boolean;
}

/** POST /business/enrollments/:enrollmentId/reset-progress (ENT-64). */
export async function resetEnrollmentProgress(enrollmentId: string): Promise<ResetProgressResponse> {
  return apiClient.post<ResetProgressResponse>(`/business/enrollments/${enrollmentId}/reset-progress`);
}

/** POST /business/enrollments/:enrollmentId/reject-offline : refus d'un paiement hors plateforme, motif obligatoire (ENT-61). */
export async function rejectOfflinePayment(
  enrollmentId: string,
  values: RejectOfflinePaymentValues,
): Promise<ManageEnrollmentResponse> {
  return apiClient.post<ManageEnrollmentResponse, RejectOfflinePaymentValues>(
    `/business/enrollments/${enrollmentId}/reject-offline`,
    values,
  );
}

export interface ManualEnrollmentResponse {
  id: string;
  status: string;
  /** true si un compte apprenant a été créé et une invitation envoyée. */
  invited: boolean;
}

/** POST /business/enrollments/manual : inscription manuelle sans paiement (ENT-62). */
export async function enrollLearnerManually(
  courseId: string,
  values: ManualEnrollmentValues,
): Promise<ManualEnrollmentResponse> {
  return apiClient.post<ManualEnrollmentResponse>("/business/enrollments/manual", toManualEnrollmentBody(courseId, values));
}
