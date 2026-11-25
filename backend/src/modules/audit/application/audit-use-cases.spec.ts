import type { AuditEntry } from "../domain/audit-entry.entity";
import type { AuditEntryRepositoryPort } from "../domain/audit-entry.repository.port";
import { ListAuditEntriesUseCase } from "./list-audit-entries.use-case";
import { RecordAuditEntryUseCase } from "./record-audit-entry.use-case";

describe("audit use cases", () => {
  const entry = { id: "e1" } as unknown as AuditEntry;
  let repo: jest.Mocked<AuditEntryRepositoryPort>;

  beforeEach(() => {
    repo = { create: jest.fn(), list: jest.fn(), count: jest.fn() };
  });

  it("RecordAuditEntryUseCase persists the entry and returns it", async () => {
    repo.create.mockResolvedValue(entry);
    const data = { tenantId: "t1", actorId: null, action: "a", objectType: "T", objectId: "o" };

    const result = await new RecordAuditEntryUseCase(repo).execute(data);

    expect(repo.create).toHaveBeenCalledWith(data);
    expect(result).toBe(entry);
  });

  it("ListAuditEntriesUseCase returns the page and the total with the same filters", async () => {
    repo.list.mockResolvedValue([entry]);
    repo.count.mockResolvedValue(42);
    const filters = { tenantId: "t1", action: "x" };
    const page = { take: 10, skip: 20 };

    const result = await new ListAuditEntriesUseCase(repo).execute(filters, page);

    expect(repo.list).toHaveBeenCalledWith(filters, page);
    expect(repo.count).toHaveBeenCalledWith(filters);
    expect(result).toEqual({ entries: [entry], total: 42 });
  });
});
