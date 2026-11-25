import {
  supervisedCertificateSchema,
  supervisedCourseSchema,
  supervisedLearnerSchema,
  supervisedTransactionSchema,
} from "../schemas/supervision.schema";
import type {
  SupervisedCertificate,
  SupervisedCourse,
  SupervisedLearner,
  SupervisedTransaction,
} from "../schemas/supervision.schema";

import { apiClient } from "@/lib/api-client";

function path(resource: string, tenantId: string | undefined): string {
  const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  return `/admin/supervision/${resource}${query}`;
}

/** GET /admin/supervision/courses — ADM-29. */
export async function fetchCourses(tenantId?: string): Promise<SupervisedCourse[]> {
  return supervisedCourseSchema.array().parse(await apiClient.get<unknown[]>(path("courses", tenantId)));
}

/** GET /admin/supervision/learners — ADM-30. */
export async function fetchLearners(tenantId?: string): Promise<SupervisedLearner[]> {
  return supervisedLearnerSchema.array().parse(await apiClient.get<unknown[]>(path("learners", tenantId)));
}

/** GET /admin/supervision/certificates — ADM-31. */
export async function fetchCertificates(tenantId?: string): Promise<SupervisedCertificate[]> {
  return supervisedCertificateSchema.array().parse(await apiClient.get<unknown[]>(path("certificates", tenantId)));
}

/** GET /admin/supervision/transactions — ADM-32. */
export async function fetchTransactions(tenantId?: string): Promise<SupervisedTransaction[]> {
  return supervisedTransactionSchema.array().parse(await apiClient.get<unknown[]>(path("transactions", tenantId)));
}
