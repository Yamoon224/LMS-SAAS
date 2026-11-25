import type { Question } from "./question.entity";

/**
 * ENT-28: "nombre de questions tirées aléatoirement, mélange des questions
 * et des réponses." Fonction pure (section 13.1) — le caractère aléatoire
 * est injecté via Math.random par défaut, mais peut être remplacé en test
 * pour un comportement déterministe.
 */
export function drawQuestions(
  questions: readonly Question[],
  count: number,
  shuffle: boolean,
  random: () => number = Math.random,
): Question[] {
  const pool = shuffle ? shuffleArray([...questions], random) : [...questions];
  return pool.slice(0, Math.min(count, pool.length));
}

/** Fisher-Yates — mélange non biaisé, contrairement à un tri par comparateur aléatoire. */
export function shuffleArray<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = temp;
  }
  return items;
}
