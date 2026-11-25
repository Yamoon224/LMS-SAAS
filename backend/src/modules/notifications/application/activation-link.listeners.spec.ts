import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { UsersFacade } from "@modules/users/users.facade";
import { BACKOFFICE_SUFFIX } from "@shared/constants/reserved-slugs";

import { NotifyUserUseCase } from "./notify-user.use-case";
import { PasswordResetRequestedListener } from "./password-reset-requested.listener";
import { UserInvitedListener } from "./user-invited.listener";

describe.each([
  {
    name: "UserInvitedListener",
    templateKey: "user.invited",
    payloadKey: "activationUrl",
    path: "/activate",
    tokenField: "activationToken",
    build: (n: NotifyUserUseCase, u: UsersFacade, t: TenantsFacade) => new UserInvitedListener(n, u, t),
  },
  {
    name: "PasswordResetRequestedListener",
    templateKey: "user.password-reset",
    payloadKey: "resetUrl",
    path: "/reset-password",
    tokenField: "resetToken",
    build: (n: NotifyUserUseCase, u: UsersFacade, t: TenantsFacade) => new PasswordResetRequestedListener(n, u, t),
  },
])("$name", ({ templateKey, payloadKey, path, tokenField, build }) => {
  const savedEnv = { ...process.env };
  let notify: { execute: jest.Mock };
  let users: { findById: jest.Mock };
  let tenants: { findById: jest.Mock };
  let listener: { handle(event: never): Promise<void> };

  const event = (token = "tok en") => ({ userId: "u1", [tokenField]: token }) as never;

  beforeEach(() => {
    process.env.APP_BASE_DOMAIN = "example.test";
    process.env.APP_URL_PROTOCOL = "http";
    notify = { execute: jest.fn().mockResolvedValue(undefined) };
    users = { findById: jest.fn() };
    tenants = { findById: jest.fn() };
    listener = build(
      notify as unknown as NotifyUserUseCase,
      users as unknown as UsersFacade,
      tenants as unknown as TenantsFacade,
    );
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("targets the back-office surface of a company user, encoding the token", async () => {
    users.findById.mockResolvedValue({ type: "COMPANY_USER", tenantId: "t1" });
    tenants.findById.mockResolvedValue({ slug: "acme" });

    await listener.handle(event());

    expect(tenants.findById).toHaveBeenCalledWith("t1");
    expect(notify.execute).toHaveBeenCalledWith({
      userId: "u1",
      templateKey,
      payload: { [payloadKey]: `http://acme${BACKOFFICE_SUFFIX}.example.test${path}?token=tok%20en` },
    });
  });

  it("targets the admin surface for a platform user without tenant lookup", async () => {
    users.findById.mockResolvedValue({ type: "PLATFORM_ADMIN", tenantId: null });

    await listener.handle(event("abc"));

    expect(tenants.findById).not.toHaveBeenCalled();
    expect(notify.execute).toHaveBeenCalledWith({
      userId: "u1",
      templateKey,
      payload: { [payloadKey]: `http://admin.example.test${path}?token=abc` },
    });
  });

  it("falls back to the admin surface when the tenant is unknown", async () => {
    users.findById.mockResolvedValue({ type: "LEARNER", tenantId: "t1" });
    tenants.findById.mockResolvedValue(null);

    await listener.handle(event("abc"));

    expect(notify.execute).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { [payloadKey]: `http://admin.example.test${path}?token=abc` } }),
    );
  });

  it("uses the default domain and https when the environment is not configured", async () => {
    delete process.env.APP_BASE_DOMAIN;
    delete process.env.APP_URL_PROTOCOL;
    users.findById.mockResolvedValue({ type: "LEARNER", tenantId: "t1" });
    tenants.findById.mockResolvedValue({ slug: "school" });

    await listener.handle(event("abc"));

    expect(notify.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { [payloadKey]: `https://school.votredomaine.local${path}?token=abc` },
      }),
    );
  });

  it("does nothing when the user cannot be found", async () => {
    users.findById.mockResolvedValue(null);

    await listener.handle(event());

    expect(tenants.findById).not.toHaveBeenCalled();
    expect(notify.execute).not.toHaveBeenCalled();
  });
});
