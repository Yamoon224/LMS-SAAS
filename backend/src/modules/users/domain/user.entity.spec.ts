import { InvalidStateTransitionError } from "@shared/errors";

import { UserStatus } from "./user-status";
import { User } from "./user.entity";

function buildUser(status: UserStatus): User {
  return User.fromPersistence({
    id: "user-1",
    tenantId: "tenant-1",
    type: "COMPANY_USER",
    email: "user@example.com",
    firstName: "Aya",
    lastName: "Koné",
    phone: null,
    locale: "fr",
    status,
    roleIds: [],
    createdAt: new Date(),
  });
}

describe("User entity", () => {
  it("is active only when status is ACTIVE", () => {
    expect(buildUser(UserStatus.ACTIVE).isActive()).toBe(true);
    expect(buildUser(UserStatus.INVITED).isActive()).toBe(false);
    expect(buildUser(UserStatus.SUSPENDED).isActive()).toBe(false);
    expect(buildUser(UserStatus.DEACTIVATED).isActive()).toBe(false);
  });

  it("computes full name from first and last name", () => {
    expect(buildUser(UserStatus.ACTIVE).fullName).toBe("Aya Koné");
  });

  it("allows activating an invited account", () => {
    const user = buildUser(UserStatus.INVITED);
    expect(user.activate()).toBe(UserStatus.ACTIVE);
  });

  it("rejects activating an already deactivated account", () => {
    const user = buildUser(UserStatus.DEACTIVATED);
    expect(() => user.activate()).toThrow(InvalidStateTransitionError);
  });

  it("allows suspending then reactivating an active account", () => {
    const user = buildUser(UserStatus.ACTIVE);
    expect(user.suspend()).toBe(UserStatus.SUSPENDED);
    expect(user.reactivate()).toBe(UserStatus.ACTIVE);
  });

  it("allows deactivating from any non-terminal status", () => {
    expect(buildUser(UserStatus.INVITED).deactivate()).toBe(UserStatus.DEACTIVATED);
    expect(buildUser(UserStatus.ACTIVE).deactivate()).toBe(UserStatus.DEACTIVATED);
    expect(buildUser(UserStatus.SUSPENDED).deactivate()).toBe(UserStatus.DEACTIVATED);
  });

  it("rejects deactivating an already deactivated account", () => {
    const user = buildUser(UserStatus.DEACTIVATED);
    expect(() => user.deactivate()).toThrow(InvalidStateTransitionError);
  });

  it("rejects reactivating or suspending accounts in the wrong status", () => {
    expect(() => buildUser(UserStatus.DEACTIVATED).reactivate()).toThrow(InvalidStateTransitionError);
    expect(() => buildUser(UserStatus.INVITED).suspend()).toThrow(InvalidStateTransitionError);
  });

  it("exposes identity accessors and trims the full name", () => {
    const user = buildUser(UserStatus.ACTIVE);
    expect(user.id).toBe("user-1");
    expect(user.tenantId).toBe("tenant-1");
    expect(user.type).toBe("COMPANY_USER");
    expect(user.email).toBe("user@example.com");
    expect(user.phone).toBeNull();
    expect(user.locale).toBe("fr");
    expect(user.firstName).toBe("Aya");
    expect(user.lastName).toBe("Koné");
    expect(user.roleIds).toEqual([]);
    const mononym = User.fromPersistence({
      id: "u2", tenantId: null, type: "PLATFORM_ADMIN", email: "a@b.c", firstName: "Madonna", lastName: "",
      phone: "+1", locale: "en", status: UserStatus.ACTIVE, roleIds: ["r"], createdAt: new Date(),
    });
    expect(mononym.fullName).toBe("Madonna");
    expect(mononym.phone).toBe("+1");
  });
});
