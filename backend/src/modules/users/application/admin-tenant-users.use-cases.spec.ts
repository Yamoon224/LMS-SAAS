import type { EventEmitter2 } from "@nestjs/event-emitter";

import { TENANT_MANAGER_ROLE_NAME, TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { AdminTenantUsersUseCase } from "./admin-tenant-users.use-cases";
import { ManageUserStatusUseCase } from "./manage-user-status.use-case";
import type { RequestPasswordResetUseCase } from "./password-reset.use-cases";
import type { ResendInvitationUseCase } from "./resend-invitation.use-case";

const OWNER = "role-owner";
const MANAGER = "role-manager";

function user(id: string, overrides: Record<string, unknown> = {}): User {
  return User.fromPersistence({
    id,
    tenantId: "t1",
    type: "COMPANY_USER",
    email: `${id}@example.com`,
    firstName: id,
    lastName: "X",
    phone: null,
    locale: "fr",
    status: UserStatus.ACTIVE,
    roleIds: [MANAGER],
    createdAt: new Date("2026-01-01"),
    ...overrides,
  } as never);
}

function setup(users: User[]) {
  const byId = new Map(users.map((u) => [u.id, u]));
  const events: Array<{ name: string; payload: unknown }> = [];
  const emitter = { emit: (name: string, payload: unknown) => events.push({ name, payload }) } as unknown as EventEmitter2;
  const assignRoles = jest.fn(async (id: string, roleIds: string[]) => {
    const current = byId.get(id)!;
    byId.set(id, user(id, { roleIds, status: current.status }));
  });
  const updateStatus = jest.fn(async (id: string, status: UserStatus) => {
    const current = byId.get(id)!;
    byId.set(id, user(id, { roleIds: current.roleIds, status, tenantId: current.tenantId, type: current.type }));
  });
  const userRepository = {
    findById: async (id: string) => byId.get(id) ?? null,
    listByTenant: async (tenantId: string | null) => [...byId.values()].filter((u) => u.tenantId === tenantId),
    updateStatus,
    assignRoles,
  } as unknown as UserRepositoryPort;
  const roleRepository = {
    findByTenantAndName: async (_t: string | null, name: string) =>
      name === TENANT_OWNER_ROLE_NAME
        ? { id: OWNER, tenantId: "t1", name }
        : name === TENANT_MANAGER_ROLE_NAME
          ? { id: MANAGER, tenantId: "t1", name }
          : null,
  } as unknown as RoleRepositoryPort;
  const manage = new ManageUserStatusUseCase(userRepository, emitter, roleRepository);
  const resend = { execute: jest.fn(async () => "token") } as unknown as ResendInvitationUseCase;
  const reset = { execute: jest.fn(async () => undefined) } as unknown as RequestPasswordResetUseCase;
  const useCase = new AdminTenantUsersUseCase(userRepository, roleRepository, manage, resend, reset, emitter);
  return { useCase, events, assignRoles, updateStatus, resend, reset, byId };
}

describe("ADM-06 : actions Admin sur les comptes d'une entreprise", () => {
  it("suspend puis réactive un compte, en journalisant l'administrateur acteur", async () => {
    const ctx = setup([user("o1", { roleIds: [OWNER] }), user("m1")]);
    await ctx.useCase.suspend("t1", "m1", "admin-1");
    expect(ctx.byId.get("m1")!.status).toBe(UserStatus.SUSPENDED);
    expect(ctx.events[0]).toMatchObject({ name: "user.suspended", payload: { userId: "m1", actorId: "admin-1" } });

    await ctx.useCase.reactivate("t1", "m1", "admin-1");
    expect(ctx.byId.get("m1")!.status).toBe(UserStatus.ACTIVE);
    expect(ctx.events[1]).toMatchObject({ name: "user.reactivated", payload: { userId: "m1", actorId: "admin-1" } });
  });

  it("refuse d'agir hors du périmètre : autre entreprise, compte plateforme, apprenant", async () => {
    const ctx = setup([
      user("other", { tenantId: "t2" }),
      user("adm", { tenantId: null, type: "PLATFORM_ADMIN" }),
      user("lrn", { type: "LEARNER" }),
    ]);
    for (const id of ["other", "adm", "lrn", "ghost"]) {
      await expect(ctx.useCase.suspend("t1", id, "a")).rejects.toThrow();
      await expect(ctx.useCase.sendPasswordReset("t1", id, "a")).rejects.toThrow();
      await expect(ctx.useCase.transferOwnership("t1", id, "a")).rejects.toThrow();
    }
    expect(ctx.updateStatus).not.toHaveBeenCalled();
  });

  it("ne suspend pas le dernier propriétaire actif, mais le permet s'il en reste un autre", async () => {
    const solo = setup([user("o1", { roleIds: [OWNER] }), user("m1")]);
    await expect(solo.useCase.suspend("t1", "o1", "a")).rejects.toMatchObject({ code: "DERNIER_PROPRIETAIRE_ACTIF" });
    expect(solo.updateStatus).not.toHaveBeenCalled();

    const duo = setup([user("o1", { roleIds: [OWNER] }), user("o2", { roleIds: [OWNER] })]);
    await duo.useCase.suspend("t1", "o1", "a");
    expect(duo.byId.get("o1")!.status).toBe(UserStatus.SUSPENDED);

    // Un second propriétaire suspendu ne compte pas comme « actif ».
    const duoSuspended = setup([user("o1", { roleIds: [OWNER] }), user("o2", { roleIds: [OWNER], status: UserStatus.SUSPENDED })]);
    await expect(duoSuspended.useCase.suspend("t1", "o1", "a")).rejects.toMatchObject({ code: "DERNIER_PROPRIETAIRE_ACTIF" });
  });

  it("renvoie l'invitation uniquement à un compte invité", async () => {
    const ctx = setup([user("i1", { status: UserStatus.INVITED }), user("a1")]);
    await ctx.useCase.resendInvitationFor("t1", "i1", "admin");
    expect(ctx.resend.execute).toHaveBeenCalledWith("i1", "t1");
    expect(ctx.events[0]).toMatchObject({ name: "user.admin-action", payload: { action: "invitation-resent" } });
    await expect(ctx.useCase.resendInvitationFor("t1", "a1", "admin")).rejects.toMatchObject({ code: "ACTION_UTILISATEUR_INVALIDE" });
  });

  it("envoie le lien de réinitialisation par e-mail sans rien retourner (compte actif seulement)", async () => {
    const ctx = setup([user("a1"), user("i1", { status: UserStatus.INVITED })]);
    const result = await ctx.useCase.sendPasswordReset("t1", "a1", "admin");
    expect(result).toBeUndefined();
    expect(ctx.reset.execute).toHaveBeenCalledWith({ tenantId: "t1", email: "a1@example.com" });
    expect(ctx.events[0]).toMatchObject({ payload: { action: "password-reset-sent" } });
    await expect(ctx.useCase.sendPasswordReset("t1", "i1", "admin")).rejects.toMatchObject({ code: "ACTION_UTILISATEUR_INVALIDE" });
  });

  it("transfère la propriété : la cible devient propriétaire, l'ancien propriétaire devient gestionnaire", async () => {
    const ctx = setup([user("o1", { roleIds: [OWNER] }), user("m1", { roleIds: [MANAGER] })]);
    await ctx.useCase.transferOwnership("t1", "m1", "admin");
    expect(ctx.byId.get("m1")!.roleIds).toEqual(expect.arrayContaining([OWNER, MANAGER]));
    expect(ctx.byId.get("o1")!.roleIds).toEqual([MANAGER]);
    expect(ctx.events.find((e) => e.name === "tenant.ownership-transferred")?.payload).toMatchObject({
      tenantId: "t1",
      newOwnerUserId: "m1",
      previousOwnerUserIds: ["o1"],
      actorId: "admin",
    });
  });

  it("refuse un transfert vers un compte inactif ou déjà seul propriétaire", async () => {
    const ctx = setup([
      user("o1", { roleIds: [OWNER] }),
      user("s1", { status: UserStatus.SUSPENDED }),
      user("i1", { status: UserStatus.INVITED }),
    ]);
    await expect(ctx.useCase.transferOwnership("t1", "s1", "a")).rejects.toMatchObject({ code: "ACTION_UTILISATEUR_INVALIDE" });
    await expect(ctx.useCase.transferOwnership("t1", "i1", "a")).rejects.toMatchObject({ code: "ACTION_UTILISATEUR_INVALIDE" });
    await expect(ctx.useCase.transferOwnership("t1", "o1", "a")).rejects.toMatchObject({ code: "ACTION_UTILISATEUR_INVALIDE" });
    expect(ctx.assignRoles).not.toHaveBeenCalled();
  });
});
