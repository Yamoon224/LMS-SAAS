"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";

import { usePurchases } from "../hooks/usePurchases";
import type { Purchase } from "../schemas/purchase.schema";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";

const STATUS_VARIANTS: Record<NonNullable<Purchase["status"]>, BadgeProps["variant"]> = {
  PENDING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "warning",
};

function methodLabel(copy: Copy, method: string | null): string | null {
  if (!method) return null;
  return copy.purchases.methods[method as keyof typeof copy.purchases.methods] ?? copy.purchases.methods.OTHER;
}

function PurchaseStatus({ purchase }: { purchase: Purchase }) {
  const copy = useCopy();
  if (purchase.kind === "OFFLINE") return <Badge variant="info">{copy.purchases.offline}</Badge>;
  return purchase.status ? (
    <Badge variant={STATUS_VARIANTS[purchase.status]}>{copy.purchases.status[purchase.status]}</Badge>
  ) : null;
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const copy = useCopy();
  const locale = useLocale();
  const method = methodLabel(copy, purchase.method);
  // Le formulaire de demande vit sur la page de la formation (même parcours que le suivi de la demande).
  const canAskRefund = purchase.kind === "ONLINE" && purchase.status === "SUCCEEDED" && purchase.refundStatus === null;

  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold">{purchase.courseTitle}</p>
        <p className="mt-1 text-sm text-subtle">
          {formatDate(purchase.purchasedAt, locale)}
          {method ? ` · ${method}` : ""}
        </p>
        {purchase.kind === "OFFLINE" && <p className="mt-1 text-xs text-subtle">{copy.purchases.offlineHint}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PurchaseStatus purchase={purchase} />
          {purchase.refundStatus && <Badge variant="neutral">{copy.purchases.refund[purchase.refundStatus]}</Badge>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <p className="text-lg font-semibold tabular-nums">{formatPrice(purchase.amount, purchase.currency, locale, copy.format)}</p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/my-learning/${purchase.enrollmentId}`}>
            {canAskRefund ? copy.purchases.askRefund : copy.purchases.openCourse}
          </Link>
        </Button>
      </div>
    </li>
  );
}

/** PUB-18 : historique d'achats de l'apprenant. */
export function PurchasesPage() {
  const copy = useCopy();
  const purchases = usePurchases();

  if (purchases.isLoading) return <Skeleton className="h-40" />;
  if (purchases.isError) {
    return <ErrorState title={copy.purchases.loadFailed} onRetry={() => void purchases.refetch()} />;
  }
  if (!purchases.data || purchases.data.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        message={copy.purchases.empty}
        action={{ href: "/", label: copy.purchases.emptyCta }}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {purchases.data.map((purchase) => (
        <PurchaseRow key={`${purchase.kind}-${purchase.id}`} purchase={purchase} />
      ))}
    </ul>
  );
}
