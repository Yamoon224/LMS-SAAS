import { shuffleArray } from "./question-drawer";
import type { Question } from "./question.entity";

/**
 * ENT-34: "tirage de N questions par module (ou pondération)". Regroupe les
 * questions par `moduleWeight` (référence au module source) et tire
 * `questionsPerModule` questions dans chaque groupe ; sans configuration,
 * retourne toutes les questions de l'examen sans tirage.
 */
export function drawQuestionsByModule(
  questions: readonly Question[],
  questionsPerModule: number | null,
  random: () => number = Math.random,
): Question[] {
  if (questionsPerModule === null) {
    return [...questions];
  }

  const byModule = new Map<string, Question[]>();
  for (const question of questions) {
    const key = question.moduleWeight ?? "__no_module__";
    const bucket = byModule.get(key) ?? [];
    bucket.push(question);
    byModule.set(key, bucket);
  }

  const drawn: Question[] = [];
  for (const bucket of byModule.values()) {
    const shuffled = shuffleArray([...bucket], random);
    drawn.push(...shuffled.slice(0, Math.min(questionsPerModule, shuffled.length)));
  }

  return drawn;
}
