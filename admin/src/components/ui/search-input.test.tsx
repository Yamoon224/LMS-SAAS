// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchInput } from "./search-input";

function Controlled({ onClear }: { onClear?: () => void }) {
  const [value, setValue] = useState("");
  return <SearchInput value={value} onValueChange={setValue} onClear={onClear} shortcut aria-label="Recherche" />;
}

describe("SearchInput", () => {
  it("remonte la saisie et affiche le bouton effacer seulement avec une valeur", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    expect(screen.queryByRole("button", { name: "Effacer la recherche" })).toBeNull();
    await user.type(screen.getByRole("searchbox"), "acme");
    expect(screen.getByRole("searchbox")).toHaveValue("acme");
    expect(screen.getByRole("button", { name: "Effacer la recherche" })).toBeInTheDocument();
  });

  it("efface au clic et avec Échap", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole("searchbox");
    await user.type(input, "abc");
    await user.click(screen.getByRole("button", { name: "Effacer la recherche" }));
    expect(input).toHaveValue("");
    await user.type(input, "xyz{Escape}");
    expect(input).toHaveValue("");
  });

  it("utilise onClear quand il est fourni", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<Controlled onClear={onClear} />);
    await user.type(screen.getByRole("searchbox"), "a");
    await user.click(screen.getByRole("button", { name: "Effacer la recherche" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("focalise le champ avec le raccourci « / »", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.keyboard("/");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
