"use client";

import { useState } from "react";

import { useMyRefunds, useRequestRefund } from "../hooks/useRequestRefund";
import type { MyRefund } from "../schemas/refund.schema";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { errorDetail } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";

function RefundForm({ enrollmentId, onDone }: { enrollmentId: string; onDone: () => void }) {
  const copy = useCopy();
  const [reason, setReason] = useState("");
  const refund = useRequestRefund();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await refund.mutateAsync({ enrollmentId, reason: reason.trim() || undefined });
      toast.success(copy.refunds.sent);
      onDone();
    } catch (error) {
      toast.error(errorDetail(error) ?? copy.refunds.failed);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
      <label htmlFor="refund-reason" className="text-sm font-medium">
        {copy.refunds.reasonLabel}
      </label>
      <textarea
        id="refund-reason"
        placeholder={copy.placeholders.refundReason}
        rows={3}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={refund.isPending}>
          {refund.isPending && <Spinner />}
          {copy.refunds.submit}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          {copy.refunds.cancel}
        </Button>
      </div>
    </form>
  );
}

function RefundStatusNotice({ refund }: { refund: MyRefund }) {
  const copy = useCopy();
  return (
    <div role="status" className="flex flex-col gap-1 text-sm">
      <p>{copy.refunds.status[refund.status]}</p>
      {refund.status === "REJECTED" && refund.decisionNote && (
        <p className="text-subtle">
          {copy.refunds.rejectionReason} {refund.decisionNote}
        </p>
      )}
    </div>
  );
}

/**
 * Demande de remboursement d'une formation achetée en ligne (section 9.5) et suivi de son statut.
 * L'éligibilité réelle est arbitrée par le serveur et par l'entreprise ; une demande refusée peut être redéposée.
 */
export function RefundRequestSection({
  enrollmentId,
  pricePaid,
}: {
  enrollmentId: string;
  pricePaid: number | null | undefined;
}) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const refunds = useMyRefunds();

  // Formation gratuite : rien à rembourser.
  if (!pricePaid || pricePaid <= 0) return null;

  // Les demandes arrivent triées de la plus récente à la plus ancienne.
  const latest = refunds.data?.find((refund) => refund.enrollmentId === enrollmentId);
  const canRequest = !latest || latest.status === "REJECTED";

  return (
    <section aria-labelledby="refund-title" className="flex flex-col gap-3 rounded-md border border-line bg-card p-4">
      <h2 id="refund-title" className="text-base font-semibold">
        {copy.refunds.title}
      </h2>
      {latest && <RefundStatusNotice refund={latest} />}
      {!latest && <p className="text-sm text-subtle">{copy.refunds.policy}</p>}
      {canRequest && !open && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
          {latest ? copy.refunds.retry : copy.refunds.open}
        </Button>
      )}
      {canRequest && open && <RefundForm enrollmentId={enrollmentId} onDone={() => setOpen(false)} />}
    </section>
  );
}
