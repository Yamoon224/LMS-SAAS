import { z } from "zod";

/** Doit rester cohérent avec LoginDto côté backend (modules/auth/presentation/dto/login.dto.ts). */
export const loginSchema = z.object({
  email: z.string().min(1, "L'e-mail est requis.").email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
