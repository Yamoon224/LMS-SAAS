import type { Metadata } from "next";

import { CourseList } from "@/features/courses/components/CourseList";

export const metadata: Metadata = {
  title: "Formations",
};

export default function CoursesPage() {
  return <CourseList />;
}
