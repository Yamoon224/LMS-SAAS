import { AuditEntry, AuditEntryProps } from "./audit-entry.entity";

describe("AuditEntry", () => {
  const props: AuditEntryProps = {
    id: "e1",
    tenantId: "t1",
    actorId: "a1",
    action: "tenant.archived",
    objectType: "Tenant",
    objectId: "t1",
    before: { x: 1 },
    after: { x: 2 },
    ipAddress: "1.2.3.4",
    userAgent: "jest",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };

  it("exposes every persisted field through getters", () => {
    const entry = AuditEntry.fromPersistence(props);

    expect(entry.id).toBe("e1");
    expect(entry.tenantId).toBe("t1");
    expect(entry.actorId).toBe("a1");
    expect(entry.action).toBe("tenant.archived");
    expect(entry.objectType).toBe("Tenant");
    expect(entry.objectId).toBe("t1");
    expect(entry.before).toEqual({ x: 1 });
    expect(entry.after).toEqual({ x: 2 });
    expect(entry.createdAt).toEqual(props.createdAt);
  });

  it("returns a snapshot copy that cannot alter the entry", () => {
    const entry = AuditEntry.fromPersistence(props);
    const snapshot = entry.toSnapshot() as AuditEntryProps;

    expect(snapshot).toEqual(props);
    snapshot.action = "tampered";
    expect(entry.action).toBe("tenant.archived");
  });
});
