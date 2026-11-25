import { purchaseSchema } from "../schemas/purchase.schema";
import type { Purchase } from "../schemas/purchase.schema";

import { apiClient } from "@/lib/api-client";

/** GET /public/payments/history — mes achats, en ligne et hors plateforme (PUB-18). */
export async function fetchPurchases(): Promise<Purchase[]> {
  return purchaseSchema.array().parse(await apiClient.get<unknown>("/public/payments/history"));
}
