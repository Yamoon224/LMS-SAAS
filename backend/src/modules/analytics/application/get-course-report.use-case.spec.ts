import { NotFoundDomainError } from "@shared/errors";

import type { CourseReportRepositoryPort } from "../domain/course-report.repository.port";

import { GetCourseReportUseCase } from "./get-course-report.use-case";

describe("GetCourseReportUseCase", () => {
  it("traite une formation absente de l'entreprise comme introuvable", async () => {
    const repository: CourseReportRepositoryPort = { getRawCourseReport: jest.fn().mockResolvedValue(null) };
    await expect(new GetCourseReportUseCase(repository).execute("tenant-1", "course-autre")).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.getRawCourseReport).toHaveBeenCalledWith("tenant-1", "course-autre");
  });

  it("construit le rapport à partir des données brutes", async () => {
    const repository: CourseReportRepositoryPort = {
      getRawCourseReport: jest.fn().mockResolvedValue({
        courseId: "c1",
        courseTitle: "Excel",
        enrolledCount: 4,
        startedCount: 2,
        moduleValidatedCount: 1,
        examPassedCount: 0,
        modules: [],
        questions: [],
        attempts: [],
      }),
    };
    const report = await new GetCourseReportUseCase(repository).execute("tenant-1", "c1");
    expect(report.funnel[1]).toMatchObject({ key: "STARTED", count: 2, percentOfEnrolled: 50 });
  });
});
