/** Section 8.1: Brouillon → Publiée ↔ Masquée → Archivée. */
export enum CourseStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  HIDDEN = "HIDDEN",
  ARCHIVED = "ARCHIVED",
}

const ALLOWED_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  [CourseStatus.DRAFT]: [CourseStatus.PUBLISHED, CourseStatus.ARCHIVED],
  [CourseStatus.PUBLISHED]: [CourseStatus.HIDDEN, CourseStatus.ARCHIVED],
  [CourseStatus.HIDDEN]: [CourseStatus.PUBLISHED, CourseStatus.ARCHIVED],
  [CourseStatus.ARCHIVED]: [],
};

export function canTransitionCourseStatus(from: CourseStatus, to: CourseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
