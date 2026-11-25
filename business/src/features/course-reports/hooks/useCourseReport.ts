import { useQuery } from "@tanstack/react-query";

import { fetchCourseReport } from "../api/course-report.api";

export function useCourseReport(courseId: string) {
  return useQuery({ queryKey: ["course-report", courseId], queryFn: () => fetchCourseReport(courseId) });
}
