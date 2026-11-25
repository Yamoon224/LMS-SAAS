import type { JwtService } from "@nestjs/jwt";

import type { AuthRepositoryPort } from "../domain/auth.repository.port";

import { TokenService } from "./token.service";

function build(user: { status: string } | null) {
  const authRepository = {
    findByValidRefreshTokenHash: jest.fn().mockResolvedValue(
      user && { id: "u-1", tenantId: "t-1", type: "COMPANY_USER", roles: [], permissions: [], ...user },
    ),
    revokeRefreshToken: jest.fn(),
    storeRefreshTokenHash: jest.fn(),
  } as unknown as AuthRepositoryPort;
  const jwtService = { sign: jest.fn().mockReturnValue("access") } as unknown as JwtService;
  return { authRepository, service: new TokenService(jwtService, authRepository) };
}

describe("TokenService.refresh", () => {
  it("rotates the token pair for an active account", async () => {
    const { authRepository, service } = build({ status: "ACTIVE" });
    await expect(service.refresh("raw")).resolves.toEqual({ accessToken: "access", refreshToken: expect.any(String) });
    expect(authRepository.revokeRefreshToken).toHaveBeenCalled();
  });

  it("refuses (and revokes the token) when the account is no longer active", async () => {
    for (const status of ["SUSPENDED", "DEACTIVATED", "INVITED"]) {
      const { authRepository, service } = build({ status });
      await expect(service.refresh("raw")).rejects.toThrow("INVALID_REFRESH_TOKEN");
      expect(authRepository.revokeRefreshToken).toHaveBeenCalled();
      expect(authRepository.storeRefreshTokenHash).not.toHaveBeenCalled();
    }
  });

  it("refuses an unknown refresh token", async () => {
    const { service } = build(null);
    await expect(service.refresh("raw")).rejects.toThrow("INVALID_REFRESH_TOKEN");
  });
});
