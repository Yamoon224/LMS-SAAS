// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
const loginMock = vi.fn();
let from: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({ get: (key: string) => (key === "from" ? from : null) }),
}));
vi.mock("../api/auth.api", () => ({ login: (...args: unknown[]) => loginMock(...args) }));

import { LoginForm } from "./LoginForm";

async function fill(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  if (email) await user.type(screen.getByLabelText("E-mail"), email);
  if (password) await user.type(screen.getByLabelText("Mot de passe"), password);
  await user.click(screen.getByRole("button", { name: /Se connecter/ }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from = null;
  });

  it("refuse un formulaire vide sans appeler l'API", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /Se connecter/ }));
    expect((await screen.findAllByRole("alert")).length).toBeGreaterThan(0);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("refuse un e-mail invalide", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await fill(user, "pas-un-email", "ChangeMe123!");
    expect(await screen.findByText("Adresse e-mail invalide.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("affiche l'erreur du serveur (mauvais mot de passe) et reste sur la page", async () => {
    loginMock.mockRejectedValue(new Error("Identifiants invalides."));
    const user = userEvent.setup();
    render(<LoginForm />);
    await fill(user, "owner@example.com", "mauvais-mot-de-passe");
    expect(await screen.findByText("Identifiants invalides.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirige vers la page demandée après connexion", async () => {
    loginMock.mockResolvedValue("done");
    from = "/courses";
    const user = userEvent.setup();
    render(<LoginForm />);
    await fill(user, "owner@example.com", "ChangeMe123!");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/courses"));
    expect(refresh).toHaveBeenCalled();
    expect(loginMock).toHaveBeenCalledWith({ email: "owner@example.com", password: "ChangeMe123!" });
  });

  it("désactive le bouton pendant l'envoi", async () => {
    let resolve: (value: string) => void = () => undefined;
    loginMock.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<LoginForm />);
    await fill(user, "owner@example.com", "ChangeMe123!");
    await waitFor(() => expect(screen.getByRole("button", { name: /Se connecter/ })).toBeDisabled());
    resolve("done");
  });
});
