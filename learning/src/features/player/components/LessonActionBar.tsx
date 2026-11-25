import { ArrowLeft, ArrowRight, Flag } from "lucide-react";
import Link from "next/link";

import type { FlatLesson } from "../lib/outline";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/i18n/client";

/** Précédent / suivant : barre fixe en bas sur mobile (pouce), en ligne sur desktop. */
export function LessonActionBar({
  enrollmentId,
  previous,
  next,
}: {
  enrollmentId: string;
  previous?: FlatLesson;
  next?: FlatLesson;
}) {
  const copy = useCopy();
  const base = `/my-learning/${enrollmentId}/learn`;
  return (
    <nav
      aria-label={copy.player.outline}
      className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
    >
      {previous ? (
        <Button asChild variant="outline" className="flex-1 md:flex-none">
          <Link href={`${base}/${previous.id}`} rel="prev">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {copy.player.previous}
          </Link>
        </Button>
      ) : (
        <span className="hidden flex-1 md:block" />
      )}
      <span className="hidden flex-1 md:block" />
      {next ? (
        <Button asChild className="flex-1 md:flex-none">
          <Link href={`${base}/${next.id}`} rel="next">
            {copy.player.next}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button asChild className="flex-1 md:flex-none">
          <Link href={`/my-learning/${enrollmentId}`}>
            <Flag className="h-4 w-4" aria-hidden="true" />
            {copy.player.finish}
          </Link>
        </Button>
      )}
    </nav>
  );
}
