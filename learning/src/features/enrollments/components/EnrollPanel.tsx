"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useEnroll, useMyEnrollments } from "../hooks/useEnrollments";
import type { Enrollment } from "../schemas/enrollment.schema";

import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { CoursePrice } from "@/features/catalogue/components/CourseMeta";
import type { CourseDetail } from "@/features/catalogue/schemas/course.schema";
import { payEnrollment } from "@/features/payments/api/payments.api";
import {
  OFFLINE,
  PaymentMethodPicker,
  PaymentPanel,
  paymentErrorMessage,
} from "@/features/payments/components/PaymentPanel";
import type { PaymentChoiceValue } from "@/features/payments/components/PaymentPanel";
import { usePaymentMethods } from "@/features/payments/hooks/usePayments";
import type { PaymentMethod } from "@/features/payments/schemas/payment.schema";
import { OfflineInstructionsBox } from "@/features/tenant/components/OfflineInstructions";
import { useCopy } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";
import { safeUrl } from "@/lib/url";

function ExistingEnrollment({ existing, methods, methodsLoading }: { existing: Enrollment; methods: PaymentMethod[]; methodsLoading: boolean }) {
  const copy = useCopy();
  const pendingPayment = existing.status === "PENDING_PAYMENT";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <EnrollmentStatusBadge status={existing.status} />
      </div>
      <p className="flex items-start gap-2 text-sm text-subtle">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {copy.statusHelp[existing.status]}
      </p>
      {existing.status === "PENDING_VALIDATION" && <OfflineInstructionsBox />}
      {pendingPayment && !methodsLoading && <PaymentPanel enrollmentId={existing.id} methods={methods} />}
      <Button asChild size="lg" variant={pendingPayment ? "outline" : "default"} className="w-full">
        <Link href={`/my-learning/${existing.id}`}>{copy.enroll.goToCourse}</Link>
      </Button>
    </div>
  );
}

function ctaLabel(copy: Copy, isFree: boolean, choice: PaymentChoiceValue): string {
  if (isFree) return copy.enroll.ctaFree;
  return choice === OFFLINE ? copy.enroll.offline : copy.payment.payAndEnroll;
}

function EnrollForm({ course, methods, methodsLoading }: { course: CourseDetail; methods: PaymentMethod[]; methodsLoading: boolean }) {
  const copy = useCopy();
  const isFree = course.price === 0;
  const enroll = useEnroll();
  const [choice, setChoice] = useState<PaymentChoiceValue | null>(null);
  const [paying, setPaying] = useState(false);
  const pending = enroll.isPending || paying;
  const effective: PaymentChoiceValue = choice ?? methods[0] ?? OFFLINE;

  async function payOnline(enrollmentId: string, method: PaymentMethod) {
    setPaying(true);
    try {
      const result = await payEnrollment(enrollmentId, method);
      const url = safeUrl(result.checkoutUrl);
      if (url) {
        window.location.assign(url);
        return;
      }
      toast.success(copy.payment.asyncInstructions);
    } catch (error) {
      toast.error(paymentErrorMessage(error, copy));
    } finally {
      setPaying(false);
    }
  }

  function handleEnroll() {
    const online = effective !== OFFLINE && !isFree;
    enroll.mutate(
      { courseId: course.id, isOfflinePayment: !isFree && !online },
      {
        onSuccess: (created) => {
          if (online) void payOnline(created.id, effective as PaymentMethod);
          else toast.success(isFree ? copy.enroll.successFree : copy.enroll.successOffline);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : copy.errors.generic),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!isFree && methodsLoading && <Skeleton className="h-24 w-full" />}
      {!isFree && !methodsLoading && (
        <>
          {methods.length === 0 && <p className="rounded-md bg-canvas p-3 text-sm text-subtle">{copy.payment.offlineOnly}</p>}
          <PaymentMethodPicker methods={methods} value={effective} onChange={setChoice} allowOffline disabled={pending} />
          {effective === OFFLINE && <OfflineInstructionsBox />}
        </>
      )}
      <Button type="button" size="lg" className="w-full" disabled={pending || (!isFree && methodsLoading)} onClick={handleEnroll}>
        {pending && <Spinner />}
        {pending ? copy.enroll.submitting : ctaLabel(copy, isFree, effective)}
      </Button>
    </div>
  );
}

export function EnrollPanel({ course, authenticated }: { course: CourseDetail; authenticated: boolean }) {
  const copy = useCopy();
  const isFree = course.price === 0;
  const enrollments = useMyEnrollments(authenticated);
  const methodsQuery = usePaymentMethods(authenticated && !isFree);
  const methods = methodsQuery.data ?? [];
  const existing = enrollments.data?.find((e) => e.courseId === course.id);

  let body: React.ReactNode;
  if (!authenticated) {
    body = (
      <Button asChild size="lg" className="w-full">
        <Link href={`/login?from=${encodeURIComponent(`/courses/${course.id}`)}`}>{copy.enroll.loginToEnroll}</Link>
      </Button>
    );
  } else if (enrollments.isLoading) {
    body = <Skeleton className="h-12 w-full" />;
  } else if (existing) {
    body = <ExistingEnrollment existing={existing} methods={methods} methodsLoading={methodsQuery.isLoading} />;
  } else {
    body = <EnrollForm course={course} methods={methods} methodsLoading={methodsQuery.isLoading} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <CoursePrice course={course} large />
      {body}
    </div>
  );
}
