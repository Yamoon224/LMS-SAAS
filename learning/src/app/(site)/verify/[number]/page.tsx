import { BadgeCheck, ShieldX } from "lucide-react";
import type { Metadata } from "next";

import { ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { verifyCertificate } from "@/features/certificates/api/certificates.server";
import { VerifyForm } from "@/features/certificates/components/VerifyForm";
import { formatDate } from "@/lib/format";
import { getCopy, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.verify.title, robots: { index: false } };
}

/** Vérification publique d'un certificat (lien du QR code) : rendue côté serveur, sans connexion. */
export default async function VerifyPage({ params }: { params: Promise<{ number: string }> }) {
  const copy = await getCopy();
  const locale = await getLocale();
  const { number: rawNumber } = await params;
  const number = decodeURIComponent(rawNumber);
  const result = await verifyCertificate(number);
  const isAttestation = result.ok && result.data.type === "ATTESTATION";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={copy.verify.title} subtitle={copy.verify.subtitle} />

      {!result.ok ? (
        <ErrorState title={copy.verify.errorTitle} detail={result.message} />
      ) : result.data.valid ? (
        <Card className="border-green-200">
          <CardContent className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-lg font-bold text-green-800">
              <BadgeCheck className="h-6 w-6" aria-hidden="true" />
              {isAttestation ? copy.verify.attestationValid : copy.verify.valid}
            </p>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {[
                [copy.verify.holder, result.data.learnerName],
                [copy.verify.course, result.data.courseTitle],
                [copy.verify.issuedOn, formatDate(result.data.issuedAt, locale)],
                [copy.verify.number, number],
                ...(isAttestation ? [[copy.verify.progress, result.data.progressPercent == null ? null : `${result.data.progressPercent}%`]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-subtle">{label}</dt>
                  <dd className="break-words font-medium">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {isAttestation && <p className="text-xs text-subtle">{copy.verify.attestationHelp}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-200">
          <CardContent className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-lg font-bold text-red-800">
              <ShieldX className="h-6 w-6" aria-hidden="true" />
              {copy.verify.invalid}
            </p>
            <p className="text-sm text-subtle">{copy.verify.invalidHelp}</p>
          </CardContent>
        </Card>
      )}

      <VerifyForm initial={number} />
    </div>
  );
}
