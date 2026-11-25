import { Award, CalendarClock, Languages, UserRound } from "lucide-react";

import type { CourseDetail } from "../schemas/course.schema";

import { formatDateTime } from "@/lib/format";
import { LOCALE_NAMES, isLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Programme : titres des modules et des leçons seulement (aucun contenu, aucun lien de ressource). */
export function CourseSyllabus({ course, copy }: { course: CourseDetail; copy: Copy }) {
  return (
    <Section id="syllabus" title={copy.vitrine.detail.syllabus}>
      {course.syllabus.length === 0 ? (
        <p className="text-sm text-subtle">{copy.vitrine.detail.syllabusEmpty}</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-subtle">
            {copy.vitrine.detail.syllabusSummary(course.modulesCount, course.lessonsCount)} · {copy.vitrine.detail.syllabusHint}
          </p>
          <ol className="flex flex-col gap-3">
            {course.syllabus.map((module, index) => (
              <li key={`${index}-${module.title}`} className="rounded-md border border-line bg-card p-4">
                <h3 className="text-sm font-semibold">
                  {copy.player.moduleLabel(index + 1)} · {module.title}
                </h3>
                {module.lessons.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-subtle">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li key={`${lessonIndex}-${lesson.title}`} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 break-words">{lesson.title}</span>
                        <span className="shrink-0 text-xs">{copy.player.lessonTypes[lesson.resourceType] ?? lesson.resourceType}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Section>
  );
}

export function CourseExtras({ course, copy, locale }: { course: CourseDetail; copy: Copy; locale: Locale }) {
  const t = copy.vitrine.detail;
  return (
    <>
      {course.instructors.length > 0 && (
        <Section id="instructors" title={t.instructors}>
          <ul className="flex flex-wrap gap-2">
            {course.instructors.map((instructor, index) => (
              <li key={`${index}-${instructor.name}`} className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm">
                <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
                {instructor.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {course.languages.length > 0 && (
        <Section id="languages" title={t.languages}>
          <ul className="flex flex-wrap gap-2">
            {course.languages.map((code) => (
              <li key={code} className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm">
                <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
                {isLocale(code) ? LOCALE_NAMES[code] : code.toUpperCase()}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {course.upcomingSessions.length > 0 && (
        <Section id="sessions" title={t.sessions}>
          <ul className="flex flex-col gap-2">
            {course.upcomingSessions.map((session, index) => (
              <li key={`${index}-${session.startAt}`} className="flex items-start gap-3 rounded-md border border-line bg-card p-3 text-sm">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-subtle">
                    {formatDateTime(session.startAt, locale)} · {copy.live.minutes(session.durationMinutes)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="certificate" title={t.certificate}>
        <p className="flex items-start gap-3 text-sm text-subtle">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          {course.certifying ? t.certifyingText : t.nonCertifyingText}
        </p>
      </Section>
    </>
  );
}
