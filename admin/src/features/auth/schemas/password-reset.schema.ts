import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "L'e-mail est requis.").email("Adresse e-mail invalide."),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les deux mots de passe ne correspondent pas.",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
