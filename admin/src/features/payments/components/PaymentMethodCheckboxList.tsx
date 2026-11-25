import type { PaymentMethod } from "../schemas/payment-provider.schema";
import { PAYMENT_METHOD_LABELS } from "../schemas/payment-provider.schema";

import { Checkbox } from "@/components/ui/checkbox";

interface PaymentMethodCheckboxListProps {
  selectedMethods: PaymentMethod[];
  onChange: (methods: PaymentMethod[]) => void;
}

/** ADM-20: sélection des moyens de paiement pris en charge par un fournisseur. */
export function PaymentMethodCheckboxList({ selectedMethods, onChange }: PaymentMethodCheckboxListProps) {
  function toggle(method: PaymentMethod, checked: boolean) {
    onChange(checked ? [...selectedMethods, method] : selectedMethods.filter((m) => m !== method));
  }

  return (
    <div role="group" aria-label="Moyens de paiement" className="grid grid-cols-1 rounded-lg border border-border sm:grid-cols-2">
      {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([method, label]) => (
        <label key={method} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm hover:bg-accent/50">
          <Checkbox
            checked={selectedMethods.includes(method)}
            onChange={(event) => toggle(method, event.target.checked)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
