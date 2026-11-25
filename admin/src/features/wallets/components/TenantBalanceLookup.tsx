"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Hourglass, Send } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useTenantBalance } from "../hooks/useTenantBalance";
import type { TenantBalanceLookupValues } from "../schemas/wallet.schema";
import { tenantBalanceLookupSchema } from "../schemas/wallet.schema";

import { AccessDenied, isForbidden } from "@/components/feedback/AccessDenied";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { useTenants } from "@/features/tenants/hooks/useTenants";
import { formatAmount } from "@/lib/format";

/** ADM-22: consultation du solde d'une entreprise (calculé à partir du grand livre). */
export function TenantBalanceLookup() {
  const [lookupTenantId, setLookupTenantId] = useState<string | null>(null);
  const { data: tenants } = useTenants();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantBalanceLookupValues>({
    resolver: zodResolver(tenantBalanceLookupSchema),
    defaultValues: { tenantId: "" },
  });

  const { data: balance, isFetching, isError, error, refetch } = useTenantBalance(
    lookupTenantId ?? "",
    lookupTenantId !== null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solde d’une entreprise</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={handleSubmit((values) => setLookupTenantId(values.tenantId.trim()))}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          noValidate
        >
          <Field id="balance-tenant" label="Entreprise" error={errors.tenantId?.message}>
            {tenants && tenants.length > 0 ? (
              <Controller
                control={control}
                name="tenantId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="balance-tenant">
                      <SelectValue placeholder="Choisir une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input id="balance-tenant" placeholder="Identifiant de l’entreprise" {...register("tenantId")} />
            )}
          </Field>
          <Button type="submit" disabled={isFetching}>
            Consulter
          </Button>
        </form>

        {isError &&
          (isForbidden(error) ? (
            <AccessDenied />
          ) : (
            <ErrorBanner title="Solde indisponible." error={error} onRetry={() => void refetch()} />
          ))}

        {lookupTenantId && !isError && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Disponible pour reversement"
              value={balance && formatAmount(balance.availableAmount, balance.currency)}
              icon={Banknote}
              isLoading={isFetching && !balance}
            />
            <StatCard
              label="En attente (rétention)"
              value={balance && formatAmount(balance.pendingAmount, balance.currency)}
              icon={Hourglass}
              isLoading={isFetching && !balance}
            />
            <StatCard
              label="Déjà reversé"
              value={balance && formatAmount(balance.payoutsExecutedAmount, balance.currency)}
              icon={Send}
              isLoading={isFetching && !balance}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
