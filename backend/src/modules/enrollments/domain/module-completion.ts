export interface LessonCompletionCheck {
  lessonId: string;
  isMandatory: boolean;
  isSatisfied: boolean;
}

export interface ModuleCompletionInput {
  /** RG-08(a): chaque contenu obligatoire du module, déjà évalué par Lesson.isCompletedBy(). */
  lessons: LessonCompletionCheck[];
  /** RG-08(b): présence(s) live obligatoire(s) du module, déjà résolue(s) par le module live-sessions. */
  requiredLiveAttendanceSatisfied: boolean;
  /** RG-08(c): quiz réussi selon la note minimale — null si le module n'a pas de quiz. */
  quizPassed: boolean | null;
}

/**
 * RG-08: "un module est validé lorsque : (a) les contenus obligatoires sont
 * consultés selon leur critère, (b) les présences live obligatoires sont
 * enregistrées, (c) le quiz est réussi selon la note minimale." Fonction
 * pure du domaine (section 13.1) — ne connaît ni Lesson, ni Quiz, ni
 * LiveSession ; ne fait que combiner leurs verdicts déjà calculés.
 */
export function isModuleValidated(input: ModuleCompletionInput): boolean {
  const mandatoryLessonsSatisfied = input.lessons
    .filter((lesson) => lesson.isMandatory)
    .every((lesson) => lesson.isSatisfied);

  const quizSatisfied = input.quizPassed === null || input.quizPassed === true;

  return mandatoryLessonsSatisfied && input.requiredLiveAttendanceSatisfied && quizSatisfied;
}
