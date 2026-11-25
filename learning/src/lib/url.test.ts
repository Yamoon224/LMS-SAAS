import { describe, expect, it } from "vitest";

import { safeUrl } from "./url";

describe("safeUrl", () => {
  it("accepte http et https", () => {
    expect(safeUrl("https://exemple.com/a?b=1")).toBe("https://exemple.com/a?b=1");
    expect(safeUrl("http://exemple.com")).toBe("http://exemple.com/");
  });

  it("refuse les schémas dangereux", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(safeUrl("file:///etc/passwd")).toBeNull();
  });

  it("refuse le vide et les valeurs non analysables", () => {
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl("")).toBeNull();
    expect(safeUrl("pas une url")).toBeNull();
  });
});
