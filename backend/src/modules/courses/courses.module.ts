import { Module } from "@nestjs/common";

import { ChangeCourseStatusUseCase } from "./application/change-course-status.use-case";
import { CreateCourseUseCase } from "./application/create-course.use-case";
import { DuplicateCourseUseCase } from "./application/duplicate-course.use-case";
import { GetCourseUseCase } from "./application/get-course.use-case";
import { ListCoursesUseCase } from "./application/list-courses.use-case";
import { ManageCourseLocalesUseCase } from "./application/manage-course-locales.use-case";
import { UpdateCourseUseCase } from "./application/update-course.use-case";
import { UpsertCourseLocaleUseCase } from "./application/upsert-course-locale.use-case";
import { CoursesFacade } from "./courses.facade";
import { COURSE_LOCALE_REPOSITORY } from "./domain/course-locale.repository.port";
import { COURSE_REPOSITORY } from "./domain/course.repository.port";
import { CourseLocalePrismaRepository } from "./infrastructure/course-locale.prisma-repository";
import { CoursePrismaRepository } from "./infrastructure/course.prisma-repository";
import { BusinessCoursesController } from "./presentation/business-courses.controller";

@Module({
  controllers: [BusinessCoursesController],
  providers: [
    CreateCourseUseCase,
    UpdateCourseUseCase,
    ChangeCourseStatusUseCase,
    DuplicateCourseUseCase,
    ListCoursesUseCase,
    GetCourseUseCase,
    UpsertCourseLocaleUseCase,
    ManageCourseLocalesUseCase,
    CoursesFacade,
    { provide: COURSE_REPOSITORY, useClass: CoursePrismaRepository },
    { provide: COURSE_LOCALE_REPOSITORY, useClass: CourseLocalePrismaRepository },
  ],
  exports: [CoursesFacade],
})
export class CoursesModule {}
