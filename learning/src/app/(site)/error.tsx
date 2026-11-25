"use client";

import { ErrorState } from "@/components/feedback/states";
import { useCopy } from "@/lib/i18n/client";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  const copy = useCopy();
  return <ErrorState title={copy.errors.generic} onRetry={reset} />;
}
