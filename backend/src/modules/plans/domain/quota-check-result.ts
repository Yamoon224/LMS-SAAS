export interface QuotaCheckResult {
  withinLimit: boolean;
  current: number;
  limit: number | null; // null = illimité
}
