"use client";

import { Award, Download, Link2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { linkedInAddToProfileUrl, verificationUrl } from "../lib/linkedin";
import type { Certificate } from "../schemas/certificate.schema";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useTenantName } from "@/features/tenant/TenantNameContext";
import { formatDate } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";
import { safeUrl } from "@/lib/url";

/** Certificat : téléchargement via URL signée du backend + lien de vérification publique. */
export function CertificateCard({ certificate, courseTitle }: { certificate: Certificate; courseTitle?: string }) {
  const copy = useCopy();
  const locale = useLocale();
  const download = safeUrl(certificate.downloadUrl);
  const organization = useTenantName();
  const [linkedInUrl, setLinkedInUrl] = useState<string | null>(null);

  // Le lien de vérification dépend de l'origine du navigateur : calculé après l'hydratation.
  useEffect(() => {
    if (certificate.status !== "VALID" || !courseTitle) return;
    setLinkedInUrl(
      linkedInAddToProfileUrl({
        name: courseTitle,
        organizationName: organization,
        issuedAt: certificate.issuedAt,
        certUrl: verificationUrl(window.location.origin, certificate.number),
        certId: certificate.number,
      }),
    );
  }, [certificate.status, certificate.issuedAt, certificate.number, courseTitle, organization]);

  async function copyVerifyLink() {
    const link = `${window.location.origin}/verify/${encodeURIComponent(certificate.number)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(copy.certificates.linkCopied);
    } catch {
      toast.error(link);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-md border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Award className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <Badge variant={certificate.status === "VALID" ? "success" : "warning"}>
            {copy.certificates.status[certificate.status] ?? certificate.status}
          </Badge>
        </div>
        {courseTitle && <p className="break-words font-semibold">{courseTitle}</p>}
        <p className="break-all text-sm text-subtle sm:break-words">
          {copy.certificates.numberLabel} {certificate.number} · {copy.certificates.issuedOn} {formatDate(certificate.issuedAt, locale)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {download && (
          <Button asChild size="sm">
            <a href={download} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" aria-hidden="true" />
              {copy.certificates.download}
            </a>
          </Button>
        )}
        {linkedInUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {copy.vitrine.linkedin.add}
            </a>
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
