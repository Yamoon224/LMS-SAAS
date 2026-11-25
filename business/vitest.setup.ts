import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Les tests de composants déclarent `// @vitest-environment jsdom` ; les autres restent en node.
afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});
