/**
 * Dupliqué depuis courses/domain/course-type.ts plutôt qu'importé : un
 * module ne doit jamais dépendre des fichiers internes (domain/...) d'un
 * autre module (section 13.2). Les valeurs doivent rester synchronisées
 * avec l'enum ProgressionMode du module courses et de Prisma.
 */
export type ProgressionMode = "SEQUENTIAL" | "FREE";

export interface ModuleOrderInfo {
  moduleId: string;
  order: number;
  validated: boolean;
}

/**
 * RG-09: "en mode séquentiel, le module N+1 n'est accessible qu'après
 * validation du module N." ENT-19: en mode libre, l'ordre est au choix.
 * Fonction pure (section 13.1) : prend l'état de validation déjà connu de
 * chaque module et décide lequel est accessible, sans aucune dépendance
 * technique.
 */
export function isModuleAccessible(
  targetModule: ModuleOrderInfo,
  allModules: readonly ModuleOrderInfo[],
  progressionMode: ProgressionMode,
): boolean {
  if (progressionMode === "FREE") {
    return true;
  }

  const precedingModules = allModules.filter((m) => m.order < targetModule.order);
  return precedingModules.every((m) => m.validated);
}
