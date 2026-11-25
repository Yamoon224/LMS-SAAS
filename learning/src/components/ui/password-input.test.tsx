// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "./password-input";

import { I18nProvider } from "@/lib/i18n/client";
import { dictionaries } from "@/lib/i18n/dictionaries";

describe("PasswordInput (learning)", () => {
  it("bascule la visibilité avec des libellés traduits", async () => {
    const user = userEvent.setup();
    const copy = dictionaries.en.auth;
    render(
      <I18nProvider locale="en">
        <PasswordInput placeholder="pw" />
      </I18nProvider>,
    );
    expect(screen.getByPlaceholderText("pw")).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: copy.showPassword }));
    expect(screen.getByPlaceholderText("pw")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: copy.hidePassword })).toHaveAttribute("aria-pressed", "true");
  });
});
