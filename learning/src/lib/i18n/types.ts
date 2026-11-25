import type { fr } from "./dictionaries/fr";

/**
 * Forme d'un dictionnaire : celle du français (source de vérité). Chaque langue est typée `Copy` : une clé
 * manquante ou en trop est une erreur de compilation.
 */
export type Copy = typeof fr;
