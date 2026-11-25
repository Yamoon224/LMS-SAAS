"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/i18n/client";

/** Confirmation d'envoi (dialog natif : focus piégé, Échap = annuler). */
export function SubmitDialog({
  open,
  unanswered,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = useCopy();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="submit-title"
      className="w-[min(26rem,92vw)] rounded-md border border-line bg-card p-0 shadow-lift backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id="submit-title" className="text-lg font-bold">
          {copy.quiz.submitTitle}
        </h2>
        <p className="text-sm text-subtle">{unanswered > 0 ? copy.quiz.submitUnanswered(unanswered) : copy.quiz.submitAllAnswered}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {copy.quiz.submitCancel}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {copy.quiz.submitConfirm}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
