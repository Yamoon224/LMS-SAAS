// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("se coche et se décoche", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Tout" onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Tout" });
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(box);
    expect(box).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("expose l'état indéterminé (propriété DOM et aria-checked=mixed)", () => {
    render(<Checkbox aria-label="Partiel" indeterminate />);
    const box = screen.getByRole("checkbox", { name: "Partiel" }) as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box).toHaveAttribute("aria-checked", "mixed");
  });

  it("ne réagit pas quand il est désactivé", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Off" disabled />);
    await user.click(screen.getByRole("checkbox", { name: "Off" }));
    expect(screen.getByRole("checkbox", { name: "Off" })).not.toBeChecked();
  });
});
