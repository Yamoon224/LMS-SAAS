"use client";

import { Download, FileCheck2, Link2 } from "lucide-react";
import { useState } from "react";

import { fetchAttestationDownloadUrl } from "../api/attestations.api";
import { useMyAttestations } from "../hooks/useAttestations";
import type { Attestation } from "../schemas/certificate.schema";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";
import { safeUrl } from "@/lib/url";

function AttestationCard({ attestation }: { attestation: Attestation }) {
  const copy = useCopy();
  const locale = useLocale();
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const url = safeUrl(await fetchAttestationDownloadUrl(attestation.id));
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errors.generic);
    } finally {
      setDownloading(false);
    }
  }

  async function copyVerifyLink() {
    const link = `${window.location.origin}/verify/${encodeURIComponent(attestation.number)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(copy.certificates.linkCopied);
    } catch {
      toast.error(link);
    }
  }

  const valid = attestation.status === "VALID";
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FileCheck2 className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <Badge variant={valid ? "success" : "warning"}>
            {copy.certificates.attestations.status[attestation.status] ?? attestation.status}
          </Badge>
        </div>
        <p className="break-words font-semibold">{attestation.courseTitle}</p>
        <p className="break-all text-sm text-subtle sm:break-words">
          {copy.certificates.numberLabel} {attestation.number} · {copy.certificates.issuedOn}{" "}
          {formatDate(attestation.issuedAt, locale)} · {copy.certificates.attestations.progress}{" "}
          {attestation.progressPercent}%
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {valid && (
          <Button type="button" size="sm" disabled={downloading} onClick={() => void download()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {copy.certificates.download}
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void copyVerifyLink()}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
          {copy.certificates.verifyLink}
        </Button>
      </div>
    </li>
  );
}

/** Attestations de suivi (ENT-44) des formations non certifiantes terminées. */
export function AttestationsSection() {
  const copy = useCopy();
  const { data, isLoading, isError, error, refetch } = useMyAttestations();

  if (isLoading) return <Skeleton className="h-24" />;
  if (isError) {
    return (
      <ErrorState
        title={copy.certificates.attestations.errorTitle}
        detail={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={FileCheck2}
        message={copy.certificates.attestations.empty}
        action={{ href: "/courses", label: copy.learning.emptyCta }}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {data.map((attestation) => (
        <AttestationCard key={attestation.id} attestation={attestation} />
      ))}
    </ul>
  );
}
