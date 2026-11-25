// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

function setup(props: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Supprimer ?"
      description="Action irréversible."
      confirmLabel="Supprimer"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onOpenChange, onConfirm };
}

describe("ConfirmDialog", () => {
  it("affiche titre, description et actions dans une boîte de dialogue accessible", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Supprimer ?" });
    expect(dialog).toHaveAccessibleDescription("Action irréversible.");
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
  });

  it("confirme et annule", async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = setup();
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("se ferme avec Échap", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("désactive les boutons pendant l'exécution", () => {
    setup({ isPending: true });
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Supprimer/ })).toBeDisabled();
  });

  it("n'affiche rien quand il est fermé", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
