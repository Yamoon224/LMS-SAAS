"use client";

import type { TenantAction } from "./TenantActionDialogs";
import { useTenantActionDialogs } from "./TenantActionDialogs";

/** Fournit `setAction` à ses enfants (render prop) et monte les dialogues d'activation / suspension. */
export function TenantActionDialogsHost({
  children,
}: {
  children: (setAction: (action: TenantAction) => void) => React.ReactNode;
}) {
  const { setAction, dialogs } = useTenantActionDialogs();
  return (
    <>
      {children(setAction)}
      {dialogs}
    </>
  );
}
