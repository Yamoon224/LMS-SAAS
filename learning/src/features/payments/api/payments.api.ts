import { knownMethods, methodsResponseSchema, payResultSchema } from "../schemas/payment.schema";
import type { PayResult, PaymentMethod } from "../schemas/payment.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const data = methodsResponseSchema.parse(await apiClient.get<unknown>("/public/payments/methods"));
  return knownMethods(data.methods);
}

export async function payEnrollment(enrollmentId: string, method: PaymentMethod): Promise<PayResult> {
  const data = await apiClient.post<unknown>(`/public/enrollments/${encodeURIComponent(enrollmentId)}/pay`, { method });
  return payResultSchema.parse(data);
}
