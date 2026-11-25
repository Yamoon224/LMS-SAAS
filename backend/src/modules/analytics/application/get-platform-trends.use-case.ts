import { Inject, Injectable } from "@nestjs/common";

import {
  ANALYTICS_REPOSITORY,
  type AnalyticsRepositoryPort,
  type DateRange,
} from "../domain/analytics.repository.port";
import type { PlatformTrendPoint, PlatformTrends, TrendGranularity } from "../domain/platform-trends";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Au-delà de ~2 mois, des barres journalières deviennent illisibles : on passe au mois. */
const MAX_DAILY_SPAN_DAYS = 62;

/** Début (UTC) de l'intervalle contenant `date`, au format YYYY-MM-DD. */
export function bucketStart(date: Date, granularity: TrendGranularity): string {
  const day = granularity === "month" ? 1 : date.getUTCDate();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day)).toISOString().slice(0, 10);
}

/** Tous les intervalles de la période, y compris les vides, pour que les courbes n'aient pas de trou. */
export function listBuckets(range: DateRange, granularity: TrendGranularity): string[] {
  const buckets: string[] = [];
  const cursor = new Date(`${bucketStart(range.from, granularity)}T00:00:00.000Z`);
  const last = bucketStart(range.to, granularity);
  for (let guard = 0; guard < 400; guard++) {
    const key = cursor.toISOString().slice(0, 10);
    if (key > last) break;
    buckets.push(key);
    if (granularity === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

export function chooseGranularity(range: DateRange): TrendGranularity {
  return (range.to.getTime() - range.from.getTime()) / DAY_MS > MAX_DAILY_SPAN_DAYS ? "month" : "day";
}

/** ADM : séries temporelles (entreprises, inscriptions, certificats, commissions) et répartitions par statut. */
@Injectable()
export class GetPlatformTrendsUseCase {
  constructor(
    @Inject(ANALYTICS_REPOSITORY) private readonly analyticsRepository: AnalyticsRepositoryPort,
  ) {}

  async execute(range: DateRange): Promise<PlatformTrends> {
    const granularity = chooseGranularity(range);
    const raw = await this.analyticsRepository.getPlatformTrendsRaw(range, granularity);

    const byBucket = <T extends { bucket: string }>(rows: T[], pick: (row: T) => number) =>
      new Map(rows.map((row) => [row.bucket, pick(row)]));
    const tenants = byBucket(raw.tenants, (row) => row.count);
    const enrollments = byBucket(raw.enrollments, (row) => row.count);
    const certificates = byBucket(raw.certificates, (row) => row.count);
    const commissions = byBucket(raw.commissions, (row) => row.amount);

    const points: PlatformTrendPoint[] = listBuckets(range, granularity).map((bucket) => ({
      bucket,
      newTenants: tenants.get(bucket) ?? 0,
      enrollments: enrollments.get(bucket) ?? 0,
      certificates: certificates.get(bucket) ?? 0,
      commissionRevenue: commissions.get(bucket) ?? 0,
    }));

    return {
      periodStart: range.from,
      periodEnd: range.to,
      granularity,
      points,
      tenantsByStatus: raw.tenantsByStatus,
      subscriptionsByStatus: raw.subscriptionsByStatus,
      currency: "XOF",
    };
  }
}
