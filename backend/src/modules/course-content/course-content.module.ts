import { CoursesModule } from "@modules/courses/courses.module";
import { MediaModule } from "@modules/media/media.module";
import { Module } from "@nestjs/common";


import { AssertContentInTenantUseCase } from "./application/assert-content-in-tenant.use-case";
import { CreateLessonUseCase } from "./application/create-lesson.use-case";
import { CreateModuleUseCase } from "./application/create-module.use-case";
import { DeleteLessonUseCase } from "./application/delete-lesson.use-case";
import { DeleteModuleUseCase } from "./application/delete-module.use-case";
import { GetLessonInCourseUseCase } from "./application/get-lesson-in-course.use-case";
import { LessonMediaUseCase } from "./application/lesson-media.use-case";
import { ListLessonsUseCase } from "./application/list-lessons.use-case";
import { ListModulesUseCase } from "./application/list-modules.use-case";
import { ManageLessonLocalesUseCase } from "./application/manage-lesson-locales.use-case";
import { ReorderLessonsUseCase } from "./application/reorder-lessons.use-case";
import { ReorderModulesUseCase } from "./application/reorder-modules.use-case";
import { UpdateLessonUseCase } from "./application/update-lesson.use-case";
import { UpdateModuleUseCase } from "./application/update-module.use-case";
import { UpsertLessonLocaleUseCase } from "./application/upsert-lesson-locale.use-case";
import { CourseContentFacade } from "./course-content.facade";
import { COURSE_MODULE_REPOSITORY } from "./domain/course-module.repository.port";
import { LESSON_LOCALE_REPOSITORY } from "./domain/lesson-locale.repository.port";
import { LESSON_REPOSITORY } from "./domain/lesson.repository.port";
import { CourseModulePrismaRepository } from "./infrastructure/course-module.prisma-repository";
import { LessonLocalePrismaRepository } from "./infrastructure/lesson-locale.prisma-repository";
import { LessonPrismaRepository } from "./infrastructure/lesson.prisma-repository";
import { BusinessLessonsController } from "./presentation/business-lessons.controller";
import { BusinessModulesController } from "./presentation/business-modules.controller";

@Module({
  imports: [CoursesModule, MediaModule],
  controllers: [BusinessModulesController, BusinessLessonsController],
  providers: [
    CreateModuleUseCase,
    UpdateModuleUseCase,
    DeleteModuleUseCase,
    ReorderModulesUseCase,
    ListModulesUseCase,
    CreateLessonUseCase,
    UpdateLessonUseCase,
    DeleteLessonUseCase,
    ReorderLessonsUseCase,
    ListLessonsUseCase,
    LessonMediaUseCase,
    GetLessonInCourseUseCase,
    UpsertLessonLocaleUseCase,
    ManageLessonLocalesUseCase,
    AssertContentInTenantUseCase,
    CourseContentFacade,
    { provide: COURSE_MODULE_REPOSITORY, useClass: CourseModulePrismaRepository },
    { provide: LESSON_REPOSITORY, useClass: LessonPrismaRepository },
    { provide: LESSON_LOCALE_REPOSITORY, useClass: LessonLocalePrismaRepository },
  ],
  exports: [CourseContentFacade],
})
export class CourseContentModule {}
