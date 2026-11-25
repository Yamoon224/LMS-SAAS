"use client";

import { Moon, ShieldCheck, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Préférences du back-office : thème (mémorisé dans ce navigateur) et accès à la sécurité du compte. */
export function SettingsPanel() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function choose(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("admin-theme", next ? "dark" : "light");
    } catch {
      // stockage indisponible : valable pour la session en cours
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Apparence</CardTitle>
          <CardDescription>Thème de l&apos;interface, enregistré sur cet appareil.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant={dark ? "outline" : "default"} onClick={() => choose(false)} aria-pressed={!dark}>
            <Sun className="h-4 w-4" aria-hidden="true" /> Clair
          </Button>
          <Button variant={dark ? "default" : "outline"} onClick={() => choose(true)} aria-pressed={dark}>
            <Moon className="h-4 w-4" aria-hidden="true" /> Sombre
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>Double authentification et codes de récupération.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/security">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Gérer la sécurité du compte
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
