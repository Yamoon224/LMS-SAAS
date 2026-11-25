import { z } from "zod";

export const creditPackSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    creditsAmount: z.number(),
    price: z.number(),
    currency: z.string(),
    isArchived: z.boolean(),
  })
  .passthrough();
export type CreditPack = z.infer<typeof creditPackSchema>;

/** Doit rester cohérent avec CreateCreditPackDto. */
export const createCreditPackSchema = z.object({
  name: z.string().min(2, "2 caractères minimum.").max(100),
  creditsAmount: z.coerce.number().int().min(1, "Au moins 1 crédit."),
  price: z.coerce.number().int().min(0, "Montant positif requis."),
  currency: z.string().length(3, "Code devise ISO sur 3 lettres (ex. XOF)."),
});
export type CreateCreditPackValues = z.infer<typeof createCreditPackSchema>;
