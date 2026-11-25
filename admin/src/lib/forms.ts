/**
 * Options `register()` pour un champ numérique FACULTATIF : un champ vide donne `undefined`
 * (et non 0 comme `z.coerce.number()` le ferait avec "").
 */
export const optionalNumber = {
  setValueAs: (value: unknown): number | undefined =>
    value === "" || value === null || value === undefined || Number.isNaN(Number(value)) ? undefined : Number(value),
};
