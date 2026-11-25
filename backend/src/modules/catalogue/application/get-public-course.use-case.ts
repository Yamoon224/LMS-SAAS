import { CourseContentFacade } from "@modules/course-content/course-content.facade";
import { CoursesFacade } from "@modules/courses/courses.facade";
import { LanguagesFacade } from "@modules/languages/languages.facade";
import { LiveSessionsFacade } from "@modules/live-sessions/live-sessions.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable } from "@nestjs/common";

const UPCOMING_SESSIONS_LIMIT = 5;

export interface PublicSyllabusLesson {
  title: string;
  resourceType: string;
}

export interface PublicSyllabusModule {
  title: string;
  lessons: PublicSyllabusLesson[];
}

export interface PublicUpcomingSession {
  title: string;
  startAt: Date;
  durationMinutes: number;
}

/**
 * PUB-03 : fiche publique d'une formation PUBLIÉE du tenant. Liste blanche stricte : le programme ne contient
 * que des titres (jamais `contentHtml`, ni URL de média, ni identifiant de leçon), les sessions live ni lien de
 * connexion ni replay, les formateurs que leur nom.
 *
 * Non inventé car absent du modèle : objectifs pédagogiques et prérequis (aucun champ `Course` ne les porte).
 */
@Injectable()
export class GetPublicCourseUseCase {
  constructor(
    private readonly coursesFacade: CoursesFacade,
    private readonly courseContentFacade: CourseContentFacade,
    private readonly liveSessionsFacade: LiveSessionsFacade,
    private readonly usersFacade: UsersFacade,
    private readonly languagesFacade: LanguagesFacade,
  ) {}

  async execute(courseId: string, tenantId: string, now: Date = new Date()) {
    // 404 uniforme : brouillon, masquée, archivée, inconnue ou d'un autre tenant.
    const course = await this.coursesFacade.findPublished(courseId, tenantId);

    const [publishedLocales, modules, sessions, instructors] = await Promise.all([
      this.coursesFacade.listPublishedCourseLocales(course.id),
      this.courseContentFacade.listModules(course.id),
      this.liveSessionsFacade.listUpcomingForCourses([course.id], now, UPCOMING_SESSIONS_LIMIT),
      this.usersFacade.findManyByIds([...course.instructorIds]),
    ]);
    const readableLocales = await this.languagesFacade.filterEnabled(publishedLocales);

    const syllabus: PublicSyllabusModule[] = [];
    for (const module of [...modules].sort((a, b) => a.order - b.order)) {
      const lessons = await this.courseContentFacade.listLessons(module.id);
      syllabus.push({
        title: module.title,
        lessons: [...lessons]
          .sort((a, b) => a.order - b.order)
          .map((lesson) => ({ title: lesson.title, resourceType: lesson.resourceType })),
      });
    }

    const languages = [...new Set([course.sourceLocale, ...readableLocales].map((code) => code.toLowerCase()))];

    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      price: course.price,
      compareAtPrice: course.compareAtPrice,
      currency: course.currency,
      type: course.type,
      category: course.category,
      level: course.level,
      estimatedDurationMinutes: course.estimatedDurationMinutes,
      accessDurationDays: course.accessDurationDays,
      progressionMode: course.progressionMode,
      coverImageUrl: course.coverImageUrl,
      publishedAt: course.publishedAt,
      language: course.sourceLocale,
      languages,
      /** PUB-03 : « modèle de certificat » côté visiteur = la formation délivre-t-elle un certificat. */
      certifying: course.type === "CERTIFYING",
      instructors: instructors
        .filter((user) => user.tenantId === tenantId)
        .map((user) => ({ name: user.fullName })),
      syllabus,
      modulesCount: syllabus.length,
      lessonsCount: syllabus.reduce((total, module) => total + module.lessons.length, 0),
      upcomingSessions: sessions.map(
        (session): PublicUpcomingSession => ({
          title: session.title,
          startAt: session.startAt,
          durationMinutes: session.durationMinutes,
        }),
      ),
    };
  }
}
