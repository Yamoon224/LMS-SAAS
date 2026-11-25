import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decodeJwtClaims } from "./jwt";

function token(payload: unknown): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.signature`;
}

describe("decodeJwtClaims", () => {
  it("décode les revendications utiles à l'UX", () => {
    const claims = decodeJwtClaims(token({ sub: "u1", tenantId: "t1", roles: ["OWNER"], permissions: ["course:read"] }));
    expect(claims).toMatchObject({ sub: "u1", tenantId: "t1", roles: ["OWNER"], permissions: ["course:read"] });
  });

  it("renvoie null pour un jeton mal formé", () => {
    expect(decodeJwtClaims("pas-un-jwt")).toBeNull();
    expect(decodeJwtClaims("a.%%%.c")).toBeNull();
    expect(decodeJwtClaims("")).toBeNull();
  });
});
