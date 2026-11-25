import { SetMetadata } from "@nestjs/common";

export const QUOTA_KEY = "quotaName";

/**
 * Declares which plan quota must be checked before a creation handler runs
 * (BE-03). `quotaName` must match a key in Plan.quotas (e.g. "maxCourses",
 * "maxActiveLearners", "storageGb", "liveSessionsPerMonth").
 */
export const CheckQuota = (quotaName: string): MethodDecorator => SetMetadata(QUOTA_KEY, quotaName);
