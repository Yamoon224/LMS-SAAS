"use client";

import { CheckCircle2, ClipboardCheck, Lock, Trophy } from "lucide-react";
import Link from "next/link";

import { sortedModules } from "../lib/outline";
import type { CourseContent, OutlineModule } from "../schemas/player.schema";

import { useAssessmentInfo } from "@/features/assessments/hooks/useAssessments";
import { useCopy } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface OutlineNavProps {
  enrollmentId: string;
  content: CourseContent;
  /** Chemin courant, pour marquer l'élément actif. */
  pathname: string;
}

const itemBase =
  "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function QuizRow({ enrollmentId, module, href, active }: { enrollmentId: string; module: OutlineModule; href: string; active: boolean }) {
  const copy = useCopy();
  // La fiche n'est demandée que pour les modules accessibles ; une erreur (pas de quiz) masque la ligne.
  const info = useAssessmentInfo(enrollmentId, { kind: "quiz", moduleId: module.id }, module.accessible);
  if (!module.accessible || !info.data) return null;
  return (
    <li>
      <Link href={href} aria-current={active ? "page" : undefined} className={cn(itemBase, active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-ink/5")}>
        <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{copy.player.quizOfModule}</span>
      </Link>
    </li>
  );
}

function ExamRow({ enrollmentId, href, active }: { enrollmentId: string; href: string; active: boolean }) {
  const copy = useCopy();
  const info = useAssessmentInfo(enrollmentId, { kind: "exam" });
  if (!info.data) return null;
  return (
    <li className="mt-2 border-t border-line pt-2">
      <Link href={href} aria-current={active ? "page" : undefined} className={cn(itemBase, active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-ink/5")}>
        <Trophy className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{copy.player.finalExam}</span>
      </Link>
    </li>
  );
}

/** Sommaire : modules, leçons, quiz et examen. Les modules verrouillés (RG-09) sont inertes et expliqués. */
export function OutlineNav({ enrollmentId, content, pathname }: OutlineNavProps) {
  const copy = useCopy();
  const base = `/my-learning/${enrollmentId}/learn`;
  const modules = sortedModules(content);

  return (
    <nav aria-label={copy.player.outline}>
      <ol className="flex flex-col gap-4">
        {modules.map((mod, index) => {
          const lessons = [...mod.lessons].sort((a, b) => a.order - b.order);
          const headingId = `outline-module-${mod.id}`;
          return (
            <li key={mod.id} aria-labelledby={headingId}>
              <div className="flex items-start gap-2 px-3 pb-1">
                {mod.validated ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label={copy.learning.modulesValidated} />
                ) : !mod.accessible ? (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-label={copy.player.lockedModule} />
                ) : null}
                <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  {copy.player.moduleLabel(index + 1)} · {mod.title}
                </h3>
              </div>
              {!mod.accessible && <p className="px-3 pb-2 text-xs text-subtle">{copy.player.lockedExplain}</p>}
              <ul className="flex flex-col gap-0.5">
                {lessons.map((lesson) => {
                  const href = `${base}/${lesson.id}`;
                  const active = pathname === href;
                  if (!mod.accessible) {
                    return (
                      <li key={lesson.id}>
                        <span aria-disabled="true" className={cn(itemBase, "cursor-not-allowed text-subtle/70")}>
                          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(itemBase, active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-ink/5")}
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-label={copy.player.completed} />
                        ) : (
                          <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-line" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                      </Link>
                    </li>
                  );
                })}
                <QuizRow
                  enrollmentId={enrollmentId}
                  module={mod}
                  href={`${base}/quiz/${mod.id}`}
                  active={pathname === `${base}/quiz/${mod.id}`}
                />
              </ul>
            </li>
          );
        })}
        <ExamRow enrollmentId={enrollmentId} href={`${base}/exam`} active={pathname === `${base}/exam`} />
      </ol>
    </nav>
  );
}
