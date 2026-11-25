import type {
  CourseTranslation,
  CreditPack,
  EnabledLanguage,
  EstimateTranslationValues,
  LedgerEntry,
  PurchaseCreditPackValues,
  PurchaseResult,
  TranslationEstimate,
  TranslationJob,
} from "../schemas/ai-translation.schema";
import {
  courseTranslationSchema,
  creditBalanceSchema,
  creditPackSchema,
  enabledLanguageSchema,
  ledgerEntrySchema,
  purchaseResultSchema,
  translationEstimateSchema,
  translationJobSchema,
} from "../schemas/ai-translation.schema";

import { apiClient } from "@/lib/api-client";

const BASE = "/business/ai-translation";

/** GET /business/ai-translation/wallet — solde de crédits IA. */
export async function fetchCreditBalance(): Promise<number> {
  const data = await apiClient.get<unknown>(`${BASE}/wallet`);
  return creditBalanceSchema.parse(data).balance;
}

/** GET /business/ai-translation/wallet/ledger — mouvements de crédits. */
export async function fetchCreditLedger(): Promise<LedgerEntry[]> {
  const data = await apiClient.get<unknown[]>(`${BASE}/wallet/ledger`);
  return ledgerEntrySchema.array().parse(data);
}

/** GET /business/plans/credit-packs — packs actifs à l'acheter (ENT-06). */
export async function fetchCreditPacks(): Promise<CreditPack[]> {
  const data = await apiClient.get<unknown[]>("/business/plans/credit-packs");
  return creditPackSchema.array().parse(data);
}

/** POST /business/ai-translation/wallet/purchase — initie le paiement; le crédit n'a lieu qu'à la confirmation serveur. */
export async function purchaseCreditPack(
  creditPackId: string,
  values: PurchaseCreditPackValues,
): Promise<PurchaseResult> {
  const body = {
    creditPackId,
    method: values.method,
    ...(values.customerEmail ? { customerEmail: values.customerEmail } : {}),
  };
  const data = await apiClient.post<unknown, typeof body>(`${BASE}/wallet/purchase`, body);
  return purchaseResultSchema.parse(data);
}

/** POST /business/ai-translation/courses/:courseId/estimate — crée un job ESTIMATED, aucun débit. */
export async function estimateTranslation(
  courseId: string,
  values: EstimateTranslationValues,
): Promise<TranslationEstimate> {
  const data = await apiClient.post<unknown, EstimateTranslationValues>(
    `${BASE}/courses/${courseId}/estimate`,
    values,
  );
  return translationEstimateSchema.parse(data);
}

/** POST /business/ai-translation/jobs/:jobId/confirm — débite les crédits estimés et lance la traduction. */
export async function confirmTranslation(jobId: string): Promise<{ jobId: string; status: string }> {
  return apiClient.post<{ jobId: string; status: string }>(`${BASE}/jobs/${jobId}/confirm`);
}

/** GET /business/ai-translation/courses/:courseId/jobs — historique d'une formation. */
export async function fetchTranslationJobs(courseId: string): Promise<TranslationJob[]> {
  const data = await apiClient.get<unknown[]>(`${BASE}/courses/${courseId}/jobs`);
  return translationJobSchema.array().parse(data);
}

/** GET /business/languages — langues cibles proposées pour la traduction IA (ADM-40). */
export async function fetchEnabledLanguages(): Promise<EnabledLanguage[]> {
  return enabledLanguageSchema.array().parse(await apiClient.get<unknown[]>("/business/languages"));
}

/** GET — langues traduites de la formation, statut et couverture des leçons (PUB-17). */
export async function fetchCourseTranslations(courseId: string): Promise<CourseTranslation[]> {
  const data = await apiClient.get<unknown[]>(`${BASE}/courses/${encodeURIComponent(courseId)}/translations`);
  return courseTranslationSchema.array().parse(data);
}

/** POST — publie (ou retire) une langue pour toute la formation. */
export async function setTranslationPublished(courseId: string, locale: string, published: boolean): Promise<unknown> {
  const action = published ? "publish" : "unpublish";
  return apiClient.post<unknown>(
    `${BASE}/courses/${encodeURIComponent(courseId)}/translations/${encodeURIComponent(locale)}/${action}`,
    {},
  );
}
