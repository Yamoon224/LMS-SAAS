import { courseReportSchema } from "../schemas/course-report.schema";
import type { CourseReport } from "../schemas/course-report.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/analytics/courses/:courseId/report — rapport par formation (ENT-67). */
export async function fetchCourseReport(courseId: string): Promise<CourseReport> {
  return courseReportSchema.parse(
    await apiClient.get<unknown>(`/business/analytics/courses/${encodeURIComponent(courseId)}/report`),
  );
}
