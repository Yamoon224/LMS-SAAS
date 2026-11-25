import { CoursesFacade } from "@modules/courses/courses.facade";
import { LanguagesFacade } from "@modules/languages/languages.facade";
import { Injectable } from "@nestjs/common";

import { buildFacets, entryLanguages, filterCatalogue, paginate, sortCatalogue } from "../domain/catalogue-query";
import type { CatalogueEntry, CatalogueFacets, CatalogueQuery, Page } from "../domain/catalogue-query";

/** Carte de formation du catalogue : liste blanche des champs publics (jamais de donnée interne). */
export interface PublicCourseCard {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  type: string;
  category: string | null;
  level: string | null;
  estimatedDurationMinutes: number | null;
  coverImageUrl: string | null;
  /** Langue d'origine de la formation. */
  language: string;
  /** Langues lisibles : origine + traductions publiées et encore activées sur la plateforme. */
  languages: string[];
  publishedAt: Date | null;
}

export interface PublicCatalogueResult extends Page<PublicCourseCard> {
  facets: CatalogueFacets;
}

/** PUB-02 : catalogue public du tenant, filtré, trié et paginé. Formations PUBLIÉES uniquement. */
@Injectable()
export class ListPublicCatalogueUseCase {
  constructor(
    private readonly coursesFacade: CoursesFacade,
    private readonly languagesFacade: LanguagesFacade,
  ) {}

  async execute(tenantId: string, query: CatalogueQuery): Promise<PublicCatalogueResult> {
    const courses = await this.coursesFacade.listPublished(tenantId);
    const publishedLocales = await this.coursesFacade.listPublishedLocalesByCourses(courses.map((course) => course.id));
    // Une traduction n'est lisible que si sa langue est toujours activée sur la plateforme (même règle que PUB-17).
    const enabled = new Set(await this.languagesFacade.filterEnabled([...new Set([...publishedLocales.values()].flat())]));

    const entries = courses.map((course) => ({
      course,
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      price: course.price,
      category: course.category,
      level: course.level,
      estimatedDurationMinutes: course.estimatedDurationMinutes,
      publishedAt: course.publishedAt,
      sourceLocale: course.sourceLocale,
      locales: (publishedLocales.get(course.id) ?? []).filter((locale) => enabled.has(locale)),
    }));

    const filtered = sortCatalogue(filterCatalogue(entries, query), query.sort);
    const page = paginate(filtered, query.page, query.pageSize);

    return {
      ...page,
      items: page.items.map((entry) => toCard(entry)),
      facets: buildFacets(entries),
    };
  }
}

function toCard(entry: CatalogueEntry & { course: PublicCourseSource }): PublicCourseCard {
  const { course } = entry;
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    price: course.price,
    compareAtPrice: course.compareAtPrice,
    currency: course.currency,
    type: course.type,
    category: course.category,
    level: course.level,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    coverImageUrl: course.coverImageUrl,
    language: course.sourceLocale,
    languages: entryLanguages(entry),
    publishedAt: course.publishedAt,
  };
}

interface PublicCourseSource {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  type: string;
  category: string | null;
  level: string | null;
  estimatedDurationMinutes: number | null;
  coverImageUrl: string | null;
  sourceLocale: string;
  publishedAt: Date | null;
}
