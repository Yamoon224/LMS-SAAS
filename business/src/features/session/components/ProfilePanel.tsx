"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { useSession } from "../hooks/useSession";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Profil du compte connecté : identifiant, rôles et nombre de permissions (données de la session). */
export function ProfilePanel() {
  const { session: data, isLoading } = useSession();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand">
            <UserRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>{data?.roles[0] ?? "Mon compte"}</CardTitle>
            <CardDescription>Compte de votre entreprise</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading || !data ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Identifiant</dt>
              <dd className="mt-1 break-all font-mono text-xs">{data.userId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Permissions accordées</dt>
              <dd className="mt-1 font-medium tabular-nums">{data.permissions.length}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Rôles</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {data.roles.length === 0 ? "—" : data.roles.map((role) => <Badge key={role}>{role}</Badge>)}
              </dd>
            </div>
          </dl>
        )}
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/security">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Sécurité du compte
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
