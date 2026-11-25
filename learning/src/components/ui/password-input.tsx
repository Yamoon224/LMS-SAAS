"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Input } from "./input";

import { useCopy } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/** Champ mot de passe avec bouton œil pour afficher / masquer la saisie. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const copy = useCopy();
    const [visible, setVisible] = React.useState(false);
    const Icon = visible ? EyeOff : Eye;

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pe-12 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? copy.auth.hidePassword : copy.auth.showPassword}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-lg text-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
