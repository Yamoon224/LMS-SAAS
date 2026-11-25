import { CourseContentModule } from "@modules/course-content/course-content.module";
import { CoursesModule } from "@modules/courses/courses.module";
import { LanguagesModule } from "@modules/languages/languages.module";
import { LiveSessionsModule } from "@modules/live-sessions/live-sessions.module";
import { UsersModule } from "@modules/users/users.module";
import { Module } from "@nestjs/common";

import { GetPublicCourseUseCase } from "./application/get-public-course.use-case";
import { ListPublicCatalogueUseCase } from "./application/list-public-catalogue.use-case";
import { PublicCatalogueController } from "./presentation/public-catalogue.controller";

/**
 * Vitrine publique (PUB-02/PUB-03) : agrège courses, course-content, live-sessions, users et languages derrière
 * leurs façades. Module distinct de `courses` car `course-content` dépend déjà de `courses` (pas de cycle).
 */
@Module({
  imports: [CoursesModule, CourseContentModule, LiveSessionsModule, UsersModule, LanguagesModule],
  controllers: [PublicCatalogueController],
  providers: [ListPublicCatalogueUseCase, GetPublicCourseUseCase],
})
export class CatalogueModule {}
