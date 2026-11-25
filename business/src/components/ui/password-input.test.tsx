// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("masque la saisie par défaut", () => {
    render(<PasswordInput placeholder="mdp" />);
    expect(screen.getByPlaceholderText("mdp")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Afficher le mot de passe" })).toHaveAttribute("aria-pressed", "false");
  });

  it("bascule affichage / masquage au clic sur l'œil", async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="mdp" />);
    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(screen.getByPlaceholderText("mdp")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    expect(screen.getByPlaceholderText("mdp")).toHaveAttribute("type", "password");
  });

  it("accepte des libellés personnalisés et transmet les props au champ", () => {
    render(<PasswordInput id="pw" showLabel="Voir" hideLabel="Cacher" disabled />);
    expect(screen.getByRole("button", { name: "Voir" })).toBeInTheDocument();
    expect(document.getElementById("pw")).toBeDisabled();
  });
});
