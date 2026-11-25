"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { useSettings } from "../hooks/useSettings";

import { BrandingForm } from "./BrandingForm";
import { ContactsForm } from "./ContactsForm";
import { OfflinePaymentForm } from "./OfflinePaymentForm";
import { PayoutAccountForm } from "./PayoutAccountForm";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

/** GET /business/subscription (BusinessSubscriptionsController.getCurrent, permission subscriptions.manage). */
const subscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  autoRenew: z.boolean(),
  currentPeriodEnd: z.coerce.date().nullish(),
});

/** Doit rester cohérent avec SubscriptionStatus (backend/.../subscriptions/domain/subscription-status.ts). */
const SUBSCRIPTION_STATUS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING_PAYMENT: { label: "Paiement en attente", variant: "warning" },
  TRIALING: { label: "Période d’essai", variant: "info" },
  ACTIVE: { label: "Active", variant: "success" },
  GRACE_PERIOD: { label: "Période de grâce", variant: "warning" },
  EXPIRED: { label: "Expirée", variant: "danger" },
  CANCELED: { label: "Résiliée", variant: "secondary" },
  SUSPENDED: { label: "Suspendue", variant: "danger" },
};

function useSubscription() {
  return useQuery({
    queryKey: ["business-subscription"],
    queryFn: async () => subscriptionSchema.parse(await apiClient.get<unknown>("/business/subscription")),
  });
}

function SubscriptionCard() {
  const { data, isLoading, isError, error, refetch } = useSubscription();
  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand" aria-hidden="true" />
          Abonnement
        </CardTitle>
        <CardDescription>État de l’abonnement de votre entreprise (lecture seule).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-16 w-full" />}
        {isError && (
          <ErrorBanner
            title={forbidden ? "Accès refusé à l’abonnement." : "Impossible de charger l’abonnement."}
            error={forbidden ? new Error("Le droit « subscriptions.manage » est requis (réservé au propriétaire).") : error}
            onRetry={forbidden ? undefined : () => void refetch()}
          />
        )}
        {data && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Statut</dt>
              <dd className="mt-1">
                <Badge variant={SUBSCRIPTION_STATUS[data.status]?.variant ?? "secondary"}>
                  {SUBSCRIPTION_STATUS[data.status]?.label ?? data.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fin de période en cours</dt>
              <dd className="mt-1 text-sm font-medium">{formatDate(data.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Renouvellement automatique</dt>
              <dd className="mt-1 text-sm font-medium">{data.autoRenew ? "Activé" : "Désactivé"}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function apply(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("business-theme", next ? "dark" : "light");
    } catch {
      // stockage indisponible : valable pour la session
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apparence</CardTitle>
        <CardDescription>Préférence enregistrée sur cet appareil uniquement.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant={dark ? "outline" : "default"} onClick={() => apply(false)} aria-pressed={!dark}>
          <Sun className="h-4 w-4" />
          Clair
        </Button>
        <Button variant={dark ? "default" : "outline"} onClick={() => apply(true)} aria-pressed={dark}>
          <Moon className="h-4 w-4" />
          Sombre
        </Button>
      </CardContent>
    </Card>
  );
}

function ForbiddenNotice() {
  return (
    <ErrorBanner
      title="Accès refusé aux paramètres de l’entreprise."
      error={new Error("Le droit « settings.manage » est requis (propriétaire ou gestionnaire).")}
    />
  );
}

function CompanySettingsTabs() {
  const { data, isLoading, isError, error, refetch } = useSettings();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) {
    if (error instanceof ApiError && error.status === 403) return <ForbiddenNotice />;
    return <ErrorBanner title="Impossible de charger les paramètres." error={error} onRetry={() => void refetch()} />;
  }
  return (
    <>
      <TabsContent value="branding">
        <BrandingForm settings={data} />
      </TabsContent>
      <TabsContent value="contacts">
        <ContactsForm settings={data} />
      </TabsContent>
      <TabsContent value="offline">
        <OfflinePaymentForm settings={data} />
      </TabsContent>
      <TabsContent value="payout">
        <PayoutAccountForm settings={data} />
      </TabsContent>
    </>
  );
}

/** Paramètres de l'entreprise (ENT-08/11/12) : identité visuelle, contacts, hors plateforme, reversement. */
export function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Paramètres" description="Identité, contacts, paiement hors plateforme et reversements de votre entreprise." />
      <Tabs defaultValue="branding" className="flex flex-col gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="branding">Identité visuelle</TabsTrigger>
          <TabsTrigger value="contacts">Contacts et légal</TabsTrigger>
          <TabsTrigger value="offline">Paiement hors plateforme</TabsTrigger>
          <TabsTrigger value="payout">Reversement</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
        </TabsList>
        <CompanySettingsTabs />
        <TabsContent value="general" className="flex flex-col gap-6">
          <SubscriptionCard />
          <AppearanceCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
