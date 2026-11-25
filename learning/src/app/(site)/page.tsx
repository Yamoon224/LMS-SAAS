import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { TenantLogo } from "@/components/layout/TenantLogo";
import { Button } from "@/components/ui/button";
import { getCatalogue } from "@/features/catalogue/api/catalogue.server";
import { CourseCard } from "@/features/catalogue/components/CourseCard";
import { catalogueHref, parseCatalogueFilters } from "@/features/catalogue/lib/catalogue-filters";
import { getTenantProfile } from "@/features/tenant/tenant.server";
import { getCopy } from "@/lib/i18n/server";
import { hasSession } from "@/lib/session";
import { getSiteOrigin } from "@/lib/site-url.server";

const FEATURED_COUNT = 6;

export async function generateMetadata(): Promise<Metadata> {
  const [copy, tenant, origin] = await Promise.all([getCopy(), getTenantProfile(), getSiteOrigin()]);
  const description = tenant.description ?? copy.vitrine.home.metaDescription(tenant.name);
  const title = copy.vitrine.home.welcome(tenant.name);
  const image = tenant.bannerUrl ?? tenant.logoUrl;
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { absolute: `${tenant.name}` },
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", title, description, siteName: tenant.name, url: "/", ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

/** Accueil public (PUB-01) : présentation de l'entreprise, formations à la une, catégories, appel à l'inscription. */
export default async function HomePage() {
  const { filters } = parseCatalogueFilters({});
  const [tenant, copy, authenticated, featured] = await Promise.all([
    getTenantProfile(),
    getCopy(),
    hasSession(),
    getCatalogue(filters, FEATURED_COUNT),
  ]);
  const t = copy.vitrine.home;

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="home-title" className="relative isolate overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-primary/15 to-primary/5">
        {tenant.bannerUrl && (
          <>
            <Image src={tenant.bannerUrl} alt="" fill unoptimized priority sizes="100vw" className="-z-10 object-cover" />
            <div className="absolute inset-0 -z-10 bg-ink/55" aria-hidden="true" />
          </>
        )}
        <div className={`flex flex-col items-start gap-5 px-6 py-12 sm:px-10 sm:py-16 ${tenant.bannerUrl ? "text-white" : ""}`}>
          <TenantLogo name={tenant.name} logoUrl={tenant.logoUrl} size="md" />
          <h1 id="home-title" className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            {t.welcome(tenant.name)}
          </h1>
          <p className={`max-w-2xl whitespace-pre-line text-base sm:text-lg ${tenant.bannerUrl ? "text-white/90" : "text-subtle"}`}>
            {tenant.description ?? t.defaultIntro}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/courses">{t.browse}</Link>
            </Button>
            {!authenticated && (
              <Button asChild size="lg" variant="outline">
                <Link href="/register">{t.ctaRegister}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {featured.ok && featured.data.items.length > 0 && (
        <section aria-labelledby="featured-title" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="featured-title" className="text-xl font-bold tracking-tight sm:text-2xl">
                {t.featuredTitle}
              </h2>
              <p className="mt-1 text-sm text-subtle">{t.featuredSubtitle}</p>
            </div>
            <Link href="/courses" className="flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline">
              {t.seeAll}
              <span aria-hidden="true" className="ms-1 inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.items.map((course, index) => (
              <CourseCard key={course.id} course={course} priority={index < 3} />
            ))}
          </ul>
        </section>
      )}

      {featured.ok && featured.data.facets.categories.length > 0 && (
        <section aria-labelledby="categories-title" className="flex flex-col gap-4">
          <h2 id="categories-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            {t.categoriesTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {featured.data.facets.categories.map((category) => (
              <li key={category.value}>
                <Link
                  href={catalogueHref(filters, { category: category.value })}
                  className="flex min-h-[44px] items-center rounded-full border border-line bg-card px-4 text-sm font-medium hover:text-primary"
                >
                  {category.value}
                  <span className="ms-2 text-xs text-subtle">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cta-title" className="flex flex-col items-start gap-3 rounded-md border border-line bg-card p-6 sm:p-8">
        <h2 id="cta-title" className="text-xl font-bold tracking-tight">
          {t.ctaTitle}
        </h2>
        <p className="max-w-xl text-sm text-subtle">{t.ctaText}</p>
        <div className="flex flex-wrap gap-3">
          {authenticated ? (
            <Button asChild>
              <Link href="/my-learning">{t.ctaMyLearning}</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/register">{t.ctaRegister}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">{t.ctaLogin}</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
