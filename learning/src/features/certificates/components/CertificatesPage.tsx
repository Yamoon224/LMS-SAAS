"use client";

import { Award } from "lucide-react";
import { useState } from "react";

import { useCertificate } from "../hooks/useCertificate";

import { AttestationsSection } from "./AttestationsSection";
import { CertificateCard } from "./CertificateCard";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourse, useMyEnrollments } from "@/features/enrollments/hooks/useEnrollments";
import type { Enrollment } from "@/features/enrollments/schemas/enrollment.schema";
import { useCopy } from "@/lib/i18n/client";

/** Une inscription terminée/expirée peut avoir un certificat (RG-17 : accessible même après expiration). */
function EnrollmentCertificate({ enrollment }: { enrollment: Enrollment }) {
  const certificate = useCertificate(enrollment.id, true);
  const course = useCourse(enrollment.courseId);

  if (certificate.isLoading) return <Skeleton className="h-24" />;
  if (!certificate.data) return null;
  return <CertificateCard certificate={certificate.data} courseTitle={course.data?.title} />;
}

function CertificatesList() {
  const copy = useCopy();
  const { data, isLoading, isError, error, refetch } = useMyEnrollments();

  if (isLoading) return <Skeleton className="h-24" />;
  if (isError) {
    return (
      <ErrorState
        title={copy.certificates.errorTitle}
        detail={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const candidates = (data ?? []).filter((e) => e.status === "COMPLETED" || e.status === "EXPIRED");
  if (candidates.length === 0) {
    return <EmptyState icon={Award} message={copy.certificates.empty} action={{ href: "/courses", label: copy.learning.emptyCta }} />;
  }

  return (
    <ul className="flex flex-col gap-4">
      {candidates.map((enrollment) => (
        <EnrollmentCertificate key={enrollment.id} enrollment={enrollment} />
      ))}
    </ul>
  );
}

type Tab = "certificates" | "attestations";

/** Certificats (formations certifiantes) et attestations de suivi (formations non certifiantes), en deux onglets. */
export function CertificatesPage() {
  const copy = useCopy();
  const [tab, setTab] = useState<Tab>("certificates");
  const tabs: Tab[] = ["certificates", "attestations"];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={copy.certificates.title} className="flex flex-wrap gap-2">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`certificates-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`certificates-panel-${id}`}
            onClick={() => setTab(id)}
            className={
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
              (tab === id
                ? "border-primary bg-primary text-white"
                : "border-line bg-card text-subtle hover:text-foreground")
            }
          >
            {copy.certificates.tabs[id]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`certificates-panel-${tab}`} aria-labelledby={`certificates-tab-${tab}`}>
        {tab === "certificates" ? <CertificatesList /> : <AttestationsSection />}
      </div>
    </div>
  );
}
