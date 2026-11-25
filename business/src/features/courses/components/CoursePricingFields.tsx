import type { FieldValues, Path, UseFormRegister } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Champs communs à CreateCourseValues et UpdateCourseValues. `currency` n'en fait pas partie :
 * UpdateCourseDto l'exclut (pick() explicite côté backend) — immuable après création, comme
 * `type`/`sourceLocale` dans CourseGeneralFields. Affiché en lecture seule en édition via la prop
 * `currency` ci-dessous, jamais soumis.
 */
export interface CoursePricingFieldValues extends FieldValues {
  price?: number;
  compareAtPrice?: number;
  accessDurationDays?: number;
}

interface CoursePricingFieldsProps<TFieldValues extends CoursePricingFieldValues> {
  register: UseFormRegister<TFieldValues>;
  errors: {
    price?: { message?: string };
    currency?: { message?: string };
    compareAtPrice?: { message?: string };
    accessDurationDays?: { message?: string };
  };
  /**
   * Devise : éditable à la création (`onCurrencyChange` fourni), affichée en lecture seule à
   * l'édition (immuable après création, cf. UpdateCourseDto).
   */
  currency: string;
  onCurrencyChange?: (value: string) => void;
}

/** Champs de tarification d'une formation (ENT-16). */
export function CoursePricingFields<TFieldValues extends CoursePricingFieldValues>({
  register,
  errors,
  currency,
  onCurrencyChange,
}: CoursePricingFieldsProps<TFieldValues>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarification</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Prix (0 = gratuit)</Label>
          <Input id="price" type="number" min={0} placeholder="Ex. : 25000" {...register("price" as Path<TFieldValues>)} />
          {errors.price && <p className="text-xs text-danger">{errors.price.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compareAtPrice">Prix barré (optionnel)</Label>
          <Input
            id="compareAtPrice"
            placeholder="Ex. : 35000"
            type="number"
            min={0}
            {...register("compareAtPrice" as Path<TFieldValues>)}
          />
          {errors.compareAtPrice && <p className="text-xs text-danger">{errors.compareAtPrice.message}</p>}
        </div>

        {onCurrencyChange ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Devise</Label>
            <Input
              id="currency"
              placeholder="XOF"
              value={currency}
              onChange={(event) => onCurrencyChange(event.target.value)}
            />
            {errors.currency && <p className="text-xs text-danger">{errors.currency.message}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label>Devise</Label>
            <p className="text-sm font-medium">{currency}</p>
            <p className="text-xs text-muted-foreground">Immuable après création.</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accessDurationDays">Durée d&apos;accès (jours, vide = illimité)</Label>
          <Input
            id="accessDurationDays"
            placeholder="Ex. : 365"
            type="number"
            min={1}
            {...register("accessDurationDays" as Path<TFieldValues>)}
          />
          {errors.accessDurationDays && <p className="text-xs text-danger">{errors.accessDurationDays.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
