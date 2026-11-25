import { Award, BarChart3, Clock, KeyRound, ListOrdered } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCourse } from "@/features/catalogue/api/catalogue.server";
import { CourseCover } from "@/features/catalogue/components/CourseCover";
import { CourseExtras, CourseSyllabus } from "@/features/catalogue/components/CourseDetailSections";
import { alternateLanguages, courseJsonLd, serializeJsonLd } from "@/features/catalogue/lib/seo";
import type { CourseDetail } from "@/features/catalogue/schemas/course.schema";
import { EnrollPanel } from "@/features/enrollments/components/EnrollPanel";
import { getTenantProfile } from "@/features/tenant/tenant.server";
import { formatDuration } from "@/lib/format";
import { getCopy, getLocale } from "@/lib/i18n/server";
import type { Copy } from "@/lib/i18n/types";
import { hasSession } from "@/lib/session";
import { absoluteUrl } from "@/lib/site-url";
import { getSiteOrigin } from "@/lib/site-url.server";
import { safeUrl } from "@/lib/url";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [result, copy, tenant, origin] = await Promise.all([getCourse(id), getCopy(), getTenantProfile(), getSiteOrigin()]);
  if (!result.ok) return { title: copy.catalogue.title, robots: { index: false } };
  const course = result.data;
  const description = (course.subtitle ?? course.description ?? undefined)?.slice(0, 300);
  const image = safeUrl(course.coverImageUrl);
  const path = `/courses/${encodeURIComponent(course.id)}`;
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: course.title,
    description,
    alternates: { canonical: path, languages: alternateLanguages(path, course.languages) },
    openGraph: {
      type: "website",
      title: course.title,
      description,
      siteName: tenant.name,
      url: path,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: course.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

function Facts({ course, copy }: { course: CourseDetail; copy: Copy }) {
  const facts = [
    { icon: Clock, label: copy.course.duration, value: formatDuration(course.estimatedDurationMinutes, copy.format) },
    { icon: BarChart3, label: copy.course.level, value: course.level ? (copy.levels[course.level] ?? course.level) : null },
    {
      icon: KeyRound,
      label: copy.course.access,
      value: course.accessDurationDays ? copy.course.accessDays(course.accessDurationDays) : copy.course.accessUnlimited,
    },
    {
      icon: ListOrdered,
      label: copy.course.progression,
      value: course.progressionMode === "SEQUENTIAL" ? copy.course.sequential : course.progressionMode ? copy.course.free : null,
    },
    {
      icon: Award,
      label: copy.course.type,
      value: course.type === "CERTIFYING" ? copy.catalogue.certifying : copy.catalogue.nonCertifying,
    },
  ].filter((fact) => fact.value);

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {facts.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <dt className="text-xs text-subtle">{label}</dt>
            <dd className="text-sm font-medium">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export default async function CoursePage({ params }: PageProps) {
  const { id } = await params;
  const [result, authenticated, copy, locale, tenant, origin] = await Promise.all([
    getCourse(id),
    hasSession(),
    getCopy(),
    getLocale(),
    getTenantProfile(),
    getSiteOrigin(),
  ]);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          title={result.status === 404 ? copy.course.notFound : copy.course.errorTitle}
          detail={result.status === 404 ? undefined : result.message}
        />
        <Link href="/courses" className="flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            ←
          </span>{" "}
          {copy.course.backToCatalogue}
        </Link>
      </div>
    );
  }

  const course = result.data;
  const jsonLd = courseJsonLd({
    name: course.title,
    description: course.description ?? course.subtitle,
    url: origin ? absoluteUrl(origin, `/courses/${encodeURIComponent(course.id)}`) : `/courses/${encodeURIComponent(course.id)}`,
    imageUrl: safeUrl(course.coverImageUrl),
    providerName: tenant.name,
    price: course.price,
    currency: course.currency,
    language: course.language,
    instructors: course.instructors.map((instructor) => instructor.name),
  });

  return (
    <article className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex flex-col gap-6">
        <Link href="/courses" className="flex min-h-[44px] items-center self-start text-sm font-medium text-subtle hover:text-ink">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            ←
          </span>{" "}
          {copy.course.backToCatalogue}
        </Link>
        <CourseCover
          src={course.coverImageUrl}
          alt=""
          priority
          sizes="(min-width: 1024px) 700px, 100vw"
          className="rounded-md"
        />
        <header className="flex flex-col gap-3">
          {course.category && <Badge className="self-start">{course.category}</Badge>}
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
          {course.subtitle && <p className="text-base text-subtle sm:text-lg">{course.subtitle}</p>}
        </header>
      </div>

      <aside className="lg:sticky lg:top-24 lg:row-span-2 lg:col-start-2 lg:row-start-1">
        <Card>
          <CardContent>
            <EnrollPanel course={course} authenticated={authenticated} />
          </CardContent>
        </Card>
      </aside>

      <div className="flex flex-col gap-8 lg:col-start-1">
        {course.description && (
          <section aria-labelledby="about">
            <h2 id="about" className="mb-3 text-lg font-semibold">
              {copy.course.about}
            </h2>
            {/* Texte brut (whitespace-pre-line) : aucun HTML injecté, donc pas de vecteur XSS. */}
            <p className="whitespace-pre-line text-sm leading-relaxed text-subtle sm:text-base">{course.description}</p>
          </section>
        )}
        <section aria-labelledby="facts">
          <h2 id="facts" className="mb-4 text-lg font-semibold">
            {copy.course.details}
          </h2>
          <Facts course={course} copy={copy} />
        </section>
        <CourseSyllabus course={course} copy={copy} />
        <CourseExtras course={course} copy={copy} locale={locale} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    </article>
  );
}
