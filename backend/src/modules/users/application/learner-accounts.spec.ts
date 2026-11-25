import type { EventEmitter2 } from "@nestjs/event-emitter";

import { TENANT_INSTRUCTOR_ROLE_NAME, TENANT_LEARNER_ROLE_NAME, TENANT_OWNER_ROLE_NAME } from "../domain/default-tenant-roles";
import type { RoleRepositoryPort } from "../domain/role.repository.port";
import { UserStatus } from "../domain/user-status";
import { User } from "../domain/user.entity";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { InviteLearnerUseCase } from "./invite-learner.use-case";
import { EmailAlreadyUsedError } from "./invite-user.use-case";
import type { InviteUserUseCase } from "./invite-user.use-case";
import { ListTrainersUseCase } from "./list-trainers.use-case";
import { ManageUserStatusUseCase, ProtectedUserActionError } from "./manage-user-status.use-case";
import { RegisterLearnerUseCase } from "./register-learner.use-case";
import type { ResendInvitationUseCase } from "./resend-invitation.use-case";

function user(overrides: Partial<Parameters<typeof User.fromPersistence>[0]> = {}): User {
  return User.fromPersistence({
    id: "u-1",
    tenantId: "t-1",
    type: "LEARNER",
    email: "a@b.co",
    firstName: "Aya",
    lastName: "Koné",
    phone: null,
    locale: "fr",
    status: UserStatus.INVITED,
    roleIds: [],
    createdAt: new Date(),
    ...overrides,
  });
}

function roleRepo(roles: Record<string, { id: string }>): RoleRepositoryPort {
  return {
    findByTenantAndName: jest.fn().mockImplementation((_t: string, name: string) => Promise.resolve(roles[name] ?? null)),
    create: jest.fn().mockResolvedValue({ id: "role-new", tenantId: "t-1", name: TENANT_LEARNER_ROLE_NAME }),
  } as unknown as RoleRepositoryPort;
}

describe("InviteLearnerUseCase", () => {
  it("invite un LEARNER avec le seul rôle Apprenant du tenant", async () => {
    const invite = { execute: jest.fn().mockResolvedValue({ user: user(), activationToken: "tok" }) };
    const useCase = new InviteLearnerUseCase(
      invite as unknown as InviteUserUseCase,
      roleRepo({ [TENANT_LEARNER_ROLE_NAME]: { id: "role-learner" } }),
    );
    await useCase.execute({ tenantId: "t-1", email: "a@b.co", firstName: "A", lastName: "B", locale: "fr" });
    expect(invite.execute).toHaveBeenCalledWith(
      expect.objectContaining({ type: "LEARNER", tenantId: "t-1", roleIds: ["role-learner"] }),
    );
  });

  it("crée le rôle Apprenant à la volée pour un tenant qui n'en a pas encore", async () => {
    const invite = { execute: jest.fn().mockResolvedValue({ user: user(), activationToken: "tok" }) };
    const roles = roleRepo({});
    await new InviteLearnerUseCase(invite as unknown as InviteUserUseCase, roles).execute({
      tenantId: "t-1",
      email: "a@b.co",
      firstName: "A",
      lastName: "B",
      locale: "fr",
    });
    expect(roles.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: TENANT_LEARNER_ROLE_NAME, permissionCodes: expect.arrayContaining(["learner.enroll"]) }),
    );
    expect(invite.execute).toHaveBeenCalledWith(expect.objectContaining({ roleIds: ["role-new"] }));
  });
});

describe("RegisterLearnerUseCase (anti-énumération)", () => {
  const input = { tenantId: "t-1", email: "  A@B.co ", firstName: "A", lastName: "B", locale: "fr" };

  function build(existing: User | null, inviteImpl?: () => Promise<unknown>) {
    const users = { findByEmailInTenant: jest.fn().mockResolvedValue(existing) } as unknown as UserRepositoryPort;
    const invite = { execute: jest.fn().mockImplementation(inviteImpl ?? (() => Promise.resolve({}))) };
    const resend = { execute: jest.fn().mockResolvedValue("tok") };
    const useCase = new RegisterLearnerUseCase(
      users,
      invite as unknown as InviteLearnerUseCase,
      resend as unknown as ResendInvitationUseCase,
    );
    return { useCase, invite, resend };
  }

  it("e-mail inconnu: crée le compte (e-mail normalisé)", async () => {
    const { useCase, invite, resend } = build(null);
    await useCase.execute(input);
    expect(invite.execute).toHaveBeenCalledWith(expect.objectContaining({ email: "a@b.co" }));
    expect(resend.execute).not.toHaveBeenCalled();
  });

  it("apprenant déjà INVITED: renvoie le lien d'activation, ne crée rien", async () => {
    const { useCase, invite, resend } = build(user({ id: "u-9", status: UserStatus.INVITED }));
    await useCase.execute(input);
    expect(resend.execute).toHaveBeenCalledWith("u-9", "t-1");
    expect(invite.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["apprenant actif", user({ status: UserStatus.ACTIVE })],
    ["apprenant suspendu", user({ status: UserStatus.SUSPENDED })],
    ["utilisateur interne invité", user({ type: "COMPANY_USER", status: UserStatus.INVITED })],
  ])("%s: aucune action et aucune erreur (réponse identique)", async (_label, existing) => {
    const { useCase, invite, resend } = build(existing);
    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(invite.execute).not.toHaveBeenCalled();
    expect(resend.execute).not.toHaveBeenCalled();
  });

  it("course concurrente (EMAIL_DEJA_UTILISE / P2002): absorbée sans erreur", async () => {
    const dup = build(null, () => Promise.reject(new EmailAlreadyUsedError("x")));
    await expect(dup.useCase.execute(input)).resolves.toBeUndefined();
    const p2002 = build(null, () => Promise.reject(Object.assign(new Error("unique"), { code: "P2002" })));
    await expect(p2002.useCase.execute(input)).resolves.toBeUndefined();
  });

  it("une erreur inattendue remonte", async () => {
    const { useCase } = build(null, () => Promise.reject(new Error("db down")));
    await expect(useCase.execute(input)).rejects.toThrow("db down");
  });
});

describe("ListTrainersUseCase", () => {
  it("ne renvoie que id + nom des utilisateurs internes ACTIFS portant le rôle Formateur", async () => {
    const users = {
      listByTenant: jest.fn().mockResolvedValue([
        user({ id: "trainer", type: "COMPANY_USER", status: UserStatus.ACTIVE, roleIds: ["r-trainer"] }),
        user({ id: "invited", type: "COMPANY_USER", status: UserStatus.INVITED, roleIds: ["r-trainer"] }),
        user({ id: "owner", type: "COMPANY_USER", status: UserStatus.ACTIVE, roleIds: ["r-owner"] }),
        user({ id: "learner", type: "LEARNER", status: UserStatus.ACTIVE, roleIds: ["r-trainer"] }),
      ]),
    } as unknown as UserRepositoryPort;
    const useCase = new ListTrainersUseCase(users, roleRepo({ [TENANT_INSTRUCTOR_ROLE_NAME]: { id: "r-trainer" } }));
    expect(await useCase.execute("t-1")).toEqual([{ id: "trainer", fullName: "Aya Koné" }]);
  });

  it("tenant sans rôle Formateur: liste vide", async () => {
    const users = { listByTenant: jest.fn() } as unknown as UserRepositoryPort;
    expect(await new ListTrainersUseCase(users, roleRepo({})).execute("t-1")).toEqual([]);
  });
});

describe("ManageUserStatusUseCase: protection soi-même / Propriétaire", () => {
  const emitter = { emit: jest.fn() } as unknown as EventEmitter2;

  function build(target: User) {
    const users = {
      findById: jest.fn().mockResolvedValue(target),
      updateStatus: jest.fn(),
    } as unknown as UserRepositoryPort;
    const roles = roleRepo({ [TENANT_OWNER_ROLE_NAME]: { id: "r-owner" } });
    return { users, useCase: new ManageUserStatusUseCase(users, emitter, roles) };
  }

  it("refuse de se suspendre / désactiver soi-même", async () => {
    const { users, useCase } = build(user({ id: "me", status: UserStatus.ACTIVE, type: "COMPANY_USER" }));
    await expect(useCase.suspend("me", "t-1", "me")).rejects.toThrow(ProtectedUserActionError);
    await expect(useCase.deactivate("me", "t-1", "me")).rejects.toThrow(ProtectedUserActionError);
    expect(users.updateStatus).not.toHaveBeenCalled();
  });

  it("refuse de suspendre / désactiver le Propriétaire du tenant", async () => {
    const { users, useCase } = build(
      user({ id: "owner", status: UserStatus.ACTIVE, type: "COMPANY_USER", roleIds: ["r-owner"] }),
    );
    await expect(useCase.suspend("owner", "t-1", "manager")).rejects.toThrow(ProtectedUserActionError);
    await expect(useCase.deactivate("owner", "t-1", "manager")).rejects.toThrow(ProtectedUserActionError);
    expect(users.updateStatus).not.toHaveBeenCalled();
  });

  it("autorise un gestionnaire à suspendre puis désactiver un autre utilisateur, et à le réactiver", async () => {
    const { users, useCase } = build(user({ id: "x", status: UserStatus.ACTIVE, type: "COMPANY_USER" }));
    await useCase.suspend("x", "t-1", "manager");
    expect(users.updateStatus).toHaveBeenLastCalledWith("x", UserStatus.SUSPENDED);

    const suspended = build(user({ id: "x", status: UserStatus.SUSPENDED, type: "COMPANY_USER" }));
    await suspended.useCase.reactivate("x", "t-1");
    expect(suspended.users.updateStatus).toHaveBeenCalledWith("x", UserStatus.ACTIVE);

    const active = build(user({ id: "y", status: UserStatus.ACTIVE, type: "COMPANY_USER" }));
    await active.useCase.deactivate("y", "t-1", "manager");
    expect(active.users.updateStatus).toHaveBeenCalledWith("y", UserStatus.DEACTIVATED);
  });

  it("la protection ne s'applique pas aux routes opérateur plateforme (sans acteur)", async () => {
    const { users, useCase } = build(
      user({ id: "owner", status: UserStatus.ACTIVE, type: "COMPANY_USER", roleIds: ["r-owner"] }),
    );
    await useCase.suspend("owner");
    expect(users.updateStatus).toHaveBeenCalled();
  });
});
