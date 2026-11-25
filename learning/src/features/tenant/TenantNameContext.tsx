"use client";

import { createContext, useContext } from "react";

const TenantNameContext = createContext<string>("");

/** Nom public de l'entreprise courante, disponible dans les composants client (ex. organisme émetteur d'un certificat). */
export function TenantNameProvider({ name, children }: { name: string; children: React.ReactNode }) {
  return <TenantNameContext.Provider value={name}>{children}</TenantNameContext.Provider>;
}

export function useTenantName(): string {
  return useContext(TenantNameContext);
}
