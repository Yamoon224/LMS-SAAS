import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_STATUS_LABELS } from "@/features/subscriptions/schemas/subscription.schema";
import type { SubscriptionStatusValue } from "@/features/subscriptions/schemas/subscription.schema";

const VARIANT_BY_STATUS: Record<SubscriptionStatusValue, "success" | "warning" | "danger" | "secondary"> = {
  PENDING_PAYMENT: "warning",
  TRIALING: "warning",
  ACTIVE: "success",
  GRACE_PERIOD: "warning",
  EXPIRED: "danger",
  CANCELED: "secondary",
  SUSPENDED: "danger",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatusValue }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>;
}
