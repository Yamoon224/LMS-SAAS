import type { Metadata } from "next";

import { LearnersCoursePicker } from "@/features/enrollments/components/LearnersCoursePicker";

export const metadata: Metadata = {
  title: "Apprenants",
};

export default function LearnersRoute() {
  return <LearnersCoursePicker />;
}
