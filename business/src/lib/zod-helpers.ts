import { z } from "zod";

/**
 * Champ numérique entier facultatif : une saisie vide (champ <input type="number"> non rempli)
 * donne `undefined` au lieu de 0 — sinon `min(1)` échouerait silencieusement sur un champ optionnel.
 */
export function optionalInt(min: number, max?: number) {
  const base = z.coerce.number().int().min(min);
  return z.preprocess(
    (value) => (value === "" || value === null || (typeof value === "number" && Number.isNaN(value)) ? undefined : value),
    (max === undefined ? base : base.max(max)).optional(),
  );
}
