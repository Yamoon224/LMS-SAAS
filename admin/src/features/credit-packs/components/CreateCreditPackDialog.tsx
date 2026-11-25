"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateCreditPack } from "../hooks/useCreateCreditPack";
import type { CreateCreditPackValues } from "../schemas/credit-pack.schema";
import { createCreditPackSchema } from "../schemas/credit-pack.schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const DEFAULTS: CreateCreditPackValues = { name: "", creditsAmount: 0, price: 0, currency: "XOF" };

export function CreateCreditPackDialog() {
  const [open, setOpen] = useState(false);
  const createCreditPack = useCreateCreditPack();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCreditPackValues>({ resolver: zodResolver(createCreditPackSchema), defaultValues: DEFAULTS });

  async function onSubmit(values: CreateCreditPackValues) {
    try {
      await createCreditPack.mutateAsync(values);
      setOpen(false);
    } catch {
      // toast d'erreur affiché par le MutationCache
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset(DEFAULTS);
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nouveau pack
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau pack de crédits IA</DialogTitle>
          <DialogDescription>
            Pack de crédits de traduction IA, proposé à l’achat aux entreprises.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field id="pack-name" label="Nom du pack" required error={errors.name?.message}>
            <Input id="pack-name" placeholder="Pack 50 000 crédits" aria-invalid={Boolean(errors.name)} {...register("name")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="pack-credits" label="Nombre de crédits" required error={errors.creditsAmount?.message}>
              <Input id="pack-credits" placeholder="50000" type="number" inputMode="numeric" min={1} aria-invalid={Boolean(errors.creditsAmount)} {...register("creditsAmount")} />
            </Field>
            <Field id="pack-price" label="Prix" required hint="Dans la plus petite unité." error={errors.price?.message}>
              <Input id="pack-price" placeholder="25000" type="number" inputMode="numeric" min={0} aria-invalid={Boolean(errors.price)} {...register("price")} />
            </Field>
          </div>
          <Field id="pack-currency" label="Devise (ISO 3)" required error={errors.currency?.message} className="sm:max-w-xs">
            <Input id="pack-currency" placeholder="XOF" maxLength={3} aria-invalid={Boolean(errors.currency)} {...register("currency")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createCreditPack.isPending}>
              {createCreditPack.isPending && <Spinner />}
              Créer le pack
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
