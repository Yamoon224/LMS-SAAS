"use client";

import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";

interface CatalogueEmptyStateProps {
  message: string;
  action?: { href: string; label: string };
}

/** Wrapper client : une icône Lucide (fonction) ne peut pas être passée depuis un Server Component. */
export function CatalogueEmptyState({ message, action }: CatalogueEmptyStateProps) {
  return <EmptyState icon={SearchX} message={message} action={action} />;
}
