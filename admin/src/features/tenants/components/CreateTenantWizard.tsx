"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createTenantFromWizard } from "../api/create-wizard";
import type { WizardOutcome } from "../api/create-wizard";
import { tenantsQueryKey } from "../hooks/useTenants";
import { STEP_FIELDS, WIZARD_DEFAULTS, wizardSchema } from "../schemas/wizard.schema";
import type { WizardStepId, WizardValues } from "../schemas/wizard.schema";

import { WizardStepper } from "./WizardStepper";
import type { StepperItem } from "./WizardStepper";
import { BillingStep, CompanyStep, IdentityStep, OwnerStep, ReviewStep } from "./WizardSteps";
import type { StepProps } from "./WizardSteps";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePlans } from "@/features/plans/hooks/usePlans";
import { BILLING_PERIOD_LABELS } from "@/features/plans/schemas/plan.schema";
import { usePermissions } from "@/features/session/hooks/useSession";
import { formatAmount } from "@/lib/format";

interface StepDefinition extends StepperItem {
  id: WizardStepId;
  title: string;
  description: string;
}

const ALL_STEPS: StepDefinition[] = [
  { id: "company", label: "Entreprise", title: "Informations de l’entreprise", description: "Nom, sous-domaine, pays, devise et langue par défaut." },
  { id: "identity", label: "Contacts et identité", hint: "Facultatif", title: "Contacts et identité visuelle", description: "Coordonnées de l’entreprise, logo et couleurs de sa marque." },
  { id: "owner", label: "Propriétaire", title: "Compte Propriétaire", description: "Le premier utilisateur de l’entreprise." },
  { id: "billing", label: "Facturation", hint: "Facultatif", title: "Paramètres de facturation", description: "Plan d’abonnement et commissions propres à cette entreprise." },
  { id: "review", label: "Validation", title: "Récapitulatif", description: "Vérifiez les informations avant de créer l’entreprise." },
];

function Outcome({ outcome, onAnother }: { outcome: WizardOutcome; onAnother: () => void }) {
  const failed = outcome.results.filter((result) => !result.ok);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${failed.length === 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
            {failed.length === 0 ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <TriangleAlert className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div role="status">
            <p className="font-medium">Entreprise «&nbsp;{outcome.tenant.slug}&nbsp;» créée.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {failed.length === 0
                ? "Tous les paramètres ont été appliqués."
                : `${failed.length} paramètre(s) n’ont pas pu être appliqués : l’entreprise existe, corrigez-les depuis sa fiche.`}
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {outcome.results.map((result) => (
            <li key={result.label} className="flex items-start gap-2 text-sm">
              {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />}
              <span className="min-w-0">
                {result.label}
                {!result.ok && <span className="block break-words text-xs text-danger">{result.error}</span>}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href={`/tenants/${outcome.tenant.id}`}>Voir la fiche de l’entreprise</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tenants">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour aux entreprises
            </Link>
          </Button>
          <Button type="button" variant="ghost" onClick={onAnother}>
            Créer une autre entreprise
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** ADM-04 / ADM-05 : création d'une entreprise en cinq étapes, avec configuration de sa facturation. */
export function CreateTenantWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const capabilities = useMemo(
    () => ({ editTenant: can("tenants.update"), assignPlan: can("subscriptions.assign"), setCommission: can("plans.manage"), activate: can("tenants.activate") }),
    [can],
  );

  const steps = useMemo(
    () =>
      ALL_STEPS.filter((step) => {
        if (step.id === "identity") return capabilities.editTenant;
        if (step.id === "billing") return capabilities.assignPlan || capabilities.setCommission;
        return true;
      }),
    [capabilities],
  );

  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<WizardOutcome | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WizardValues>({ resolver: zodResolver(wizardSchema), defaultValues: WIZARD_DEFAULTS, mode: "onTouched" });

  const plans = usePlans();
  const planOptions = useMemo(
    () =>
      (plans.data ?? [])
        .filter((plan) => !plan.isArchived)
        .flatMap((plan) =>
          plan.prices
            .filter((price) => price.isActive)
            .map((price) => ({ value: price.id, label: `${plan.name} — ${BILLING_PERIOD_LABELS[price.period]} (${formatAmount(price.amount, price.currency)})` })),
        ),
    [plans.data],
  );

  const step = steps[index] ?? steps[0]!;
  const isLast = index === steps.length - 1;
  const values = watch();
  const stepProps: StepProps = { register, control, errors, watch, setValue };

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step.id] as unknown as (keyof WizardValues)[]);
    if (valid) setIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  async function create(submitted: WizardValues) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createTenantFromWizard(submitted, capabilities);
      void queryClient.invalidateQueries({ queryKey: tenantsQueryKey });
      setOutcome(result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "La création a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Le résolveur valide tout : en cas d'erreur à la validation finale, on revient à la première étape concernée. */
  function onInvalid(invalid: Record<string, unknown>) {
    const owning = steps.findIndex((candidate) => STEP_FIELDS[candidate.id].some((field) => field.split(".")[0] !== undefined && field.split(".")[0]! in invalid));
    if (owning >= 0) setIndex(owning);
  }

  function restart() {
    reset(WIZARD_DEFAULTS);
    setOutcome(null);
    setError(null);
    setIndex(0);
  }

  if (outcome) return <Outcome outcome={outcome} onAnother={restart} />;

  const selectedPlan = planOptions.find((option) => option.value === values.planPriceId);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isLast) void handleSubmit(create, onInvalid)();
        else void goNext();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <WizardStepper
        steps={steps}
        current={index}
        onSelect={(target) => {
          if (target < index) setIndex(target);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step.id === "company" && <CompanyStep {...stepProps} />}
          {step.id === "identity" && <IdentityStep {...stepProps} />}
          {step.id === "owner" && <OwnerStep {...stepProps} />}
          {step.id === "billing" && (
            <BillingStep
              {...stepProps}
              planOptions={planOptions}
              plansState={plans.isLoading ? "loading" : plans.isError ? "error" : "ready"}
              canAssignPlan={capabilities.assignPlan}
              canSetCommission={capabilities.setCommission}
            />
          )}
          {step.id === "review" && (
            <ReviewStep
              values={values}
              planLabel={selectedPlan?.label ?? null}
              canActivate={capabilities.activate}
              canEditTenant={capabilities.editTenant}
              canAssignPlan={capabilities.assignPlan}
              canSetCommission={capabilities.setCommission}
              control={control}
            />
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/tenants")} disabled={submitting}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Annuler et retourner aux entreprises
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {index > 0 && (
            <Button type="button" variant="outline" onClick={() => setIndex((current) => current - 1)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Précédent
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner />}
            {isLast ? "Créer l’entreprise" : "Suivant"}
            {!isLast && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </form>
  );
}
