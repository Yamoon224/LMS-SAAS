import { z } from "zod";

import type { Copy } from "@/lib/i18n/types";

export function createLoginSchema(copy: Copy) {
  return z.object({
    email: z.string().email(copy.auth.emailInvalid),
    password: z.string().min(1, copy.auth.passwordRequired),
  });
}
export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

export function createActivateSchema(copy: Copy) {
  return z
    .object({
      password: z.string().min(8, copy.auth.passwordMin),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: copy.auth.passwordMismatch,
    });
}
export type ActivateFormValues = z.infer<ReturnType<typeof createActivateSchema>>;

export function createRegisterSchema(copy: Copy) {
  return z.object({
    email: z.string().trim().email(copy.auth.emailInvalid),
    firstName: z.string().trim().min(1, copy.auth.firstNameRequired).max(100),
    lastName: z.string().trim().min(1, copy.auth.lastNameRequired).max(100),
    phone: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\+?[0-9 ().-]{6,20}$/.test(value), copy.auth.phoneInvalid),
  });
}
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

export function createForgotPasswordSchema(copy: Copy) {
  return z.object({
    email: z.string().trim().email(copy.auth.emailInvalid),
  });
}
export type ForgotPasswordValues = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
