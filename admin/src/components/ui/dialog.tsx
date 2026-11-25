"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Modale accessible (Radix : piège de focus, Échap, aria-labelledby/describedby via DialogTitle/DialogDescription).
 * Mobile : feuille ancrée en bas ; à partir de sm : modale centrée.
 *
 * Seul le CORPS défile (la modale elle-même ne rogne rien : les listes déroulantes peuvent déborder) : `DialogHeader` (titre) reste collé en haut et `DialogFooter` (actions) en bas, quelle que soit la
 * longueur du contenu. Le bouton de fermeture est hors de la zone défilante, donc toujours visible. La hauteur est bornée ici :
 * ne pas ajouter `max-h-*` ni `overflow-*` sur `DialogContent`.
 */
export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] w-full flex-col rounded-t-md border border-border border-b-4 border-b-brand bg-surface shadow-pop animate-pop-in sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md",
          className,
        )}
        {...props}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[inherit] p-5 sm:p-6">{children}</div>
        <DialogPrimitive.Close className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8">
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** En-tête collé en haut du corps défilant (les marges négatives le font couvrir le remplissage de la modale). */
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky -top-5 z-10 -mx-5 -mt-5 mb-4 flex flex-col gap-1 border-b border-border bg-surface px-5 pb-3 pr-14 pt-5 sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pr-14 sm:pt-6",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Actions collées en bas du corps défilant : toujours accessibles, même sur un long formulaire. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky -bottom-5 z-10 -mx-5 -mb-5 mt-6 flex flex-col-reverse gap-2 border-t border-border bg-surface px-5 py-3 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
