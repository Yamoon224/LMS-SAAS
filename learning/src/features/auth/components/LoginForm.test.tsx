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

import { I18nProvider } from "@/lib/i18n/client";
import { dictionaries } from "@/lib/i18n/dictionaries";

const copy = dictionaries.fr;

function setup() {
  const user = userEvent.setup();
  render(
    <I18nProvider locale="fr">
      <LoginForm />
    </I18nProvider>,
  );
  return user;
}

async function submit(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  if (email) await user.type(screen.getByLabelText(copy.auth.email), email);
  if (password) await user.type(screen.getByLabelText(copy.auth.password), password);
  await user.click(screen.getByRole("button", { name: copy.auth.submit }));
}

describe("LoginForm (learning)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from = null;
  });

  it("affiche les messages de validation traduits et n'appelle pas l'API", async () => {
    const user = setup();
    await submit(user, "", "");
    expect(await screen.findByText(copy.auth.emailInvalid)).toBeInTheDocument();
    expect(screen.getByText(copy.auth.passwordRequired)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("affiche l'erreur serveur sans rediriger", async () => {
    loginMock.mockRejectedValue(new Error(copy.auth.invalid));
    const user = setup();
    await submit(user, "learner@example.com", "mauvais");
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.auth.invalid);
    expect(push).not.toHaveBeenCalled();
  });

  it("redirige vers /my-learning par défaut", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = setup();
    await submit(user, "learner@example.com", "ChangeMe123!");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/my-learning"));
    expect(refresh).toHaveBeenCalled();
  });

  it("suit ?from= pour un chemin interne", async () => {
    loginMock.mockResolvedValue(undefined);
    from = "/certificates";
    const user = setup();
    await submit(user, "learner@example.com", "ChangeMe123!");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/certificates"));
  });

  it("refuse une redirection externe (open redirect)", async () => {
    loginMock.mockResolvedValue(undefined);
    from = "//evil.example.com";
    const user = setup();
    await submit(user, "learner@example.com", "ChangeMe123!");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/my-learning"));
  });
});
