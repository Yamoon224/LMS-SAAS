import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { SUBSCRIPTION_STATUS_LABELS } from "@/features/subscription/schemas/subscription.schema";
import type { SubscriptionStatus } from "@/features/subscription/schemas/subscription.schema";

const VARIANT_BY_STATUS: Record<SubscriptionStatus, BadgeProps["variant"]> = {
  PENDING_PAYMENT: "warning",
  TRIALING: "info",
  ACTIVE: "success",
  GRACE_PERIOD: "warning",
  EXPIRED: "danger",
  CANCELED: "secondary",
  SUSPENDED: "danger",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>;
}
