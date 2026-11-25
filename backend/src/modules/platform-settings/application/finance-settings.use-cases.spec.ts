import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { StoredSettingRow } from "../domain/finance-settings";
import { InvalidFinanceSettingError } from "../domain/finance-settings";
import type { PlatformSettingRepositoryPort } from "../domain/platform-setting.repository.port";
import type { FinanceSettingChangedEvent } from "../platform-settings.events";

import {
  GetFinanceSettingsUseCase,
  SETTINGS_CACHE_TTL_MS,
  UpdateFinanceSettingsUseCase,
} from "./finance-settings.use-cases";

function setup(initial: StoredSettingRow[] = []) {
  const rows = [...initial];
  const repository: PlatformSettingRepositoryPort = {
    listFinanceRows: jest.fn(async () => [...rows]),
    append: jest.fn(async (key, value, effectiveFrom) => {
      rows.push({ key, value, effectiveFrom });
    }),
    listHistory: jest.fn(),
  };
  const emit = jest.fn();
  const get = new GetFinanceSettingsUseCase(repository);
  const update = new UpdateFinanceSettingsUseCase(repository, get, { emit } as unknown as EventEmitter2);
  return { repository, get, update, emit };
}

describe("UpdateFinanceSettingsUseCase", () => {
  it("écrit une nouvelle version et émet un événement d'audit avec ancienne et nouvelle valeur", async () => {
    const { update, repository, emit } = setup();
    const result = await update.execute({ retentionDays: 14, transactionFeeBearer: "PLATFORM" }, "admin-1");

    expect(result).toMatchObject({ retentionDays: 14, transactionFeeBearer: "PLATFORM", minimumPayoutThreshold: 10000 });
    expect(repository.append).toHaveBeenCalledTimes(2);
    const events = emit.mock.calls.map(([name, event]: [string, FinanceSettingChangedEvent]) => [name, event]);
    expect(events).toEqual(
      expect.arrayContaining([
        ["finance-setting.changed", expect.objectContaining({ field: "retentionDays", previousValue: 7, newValue: 14, actorUserId: "admin-1" })],
        ["finance-setting.changed", expect.objectContaining({ field: "transactionFeeBearer", previousValue: "TENANT", newValue: "PLATFORM" })],
      ]),
    );
  });

  it("refuse une valeur hors bornes sans rien écrire, même si un autre champ du lot est valide", async () => {
    const { update, repository, emit } = setup();
    await expect(update.execute({ minimumPayoutThreshold: 5000, retentionDays: 91 }, "admin-1")).rejects.toThrow(
      InvalidFinanceSettingError,
    );
    await expect(update.execute({ minimumPayoutThreshold: -1 }, "admin-1")).rejects.toThrow(InvalidFinanceSettingError);
    expect(repository.append).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("ignore une valeur identique à l'actuelle : aucune version, aucun audit", async () => {
    const { update, repository, emit } = setup();
    await update.execute({ retentionDays: 7, payoutFrequency: "MANUAL" }, "admin-1");
    expect(repository.append).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("n'efface jamais l'historique : on n'ajoute que des lignes", async () => {
    const { update, repository } = setup();
    await update.execute({ retentionDays: 10 }, "a");
    await update.execute({ retentionDays: 20 }, "a");
    expect(repository.append).toHaveBeenCalledTimes(2);
  });
});

describe("GetFinanceSettingsUseCase — cache bref", () => {
  it("relit le dépôt une seule fois dans la fenêtre du cache, puis à l'expiration", async () => {
    const { get, repository } = setup();
    const t0 = new Date("2026-11-18T10:00:00Z");
    await get.execute(t0);
    await get.execute(new Date(t0.getTime() + SETTINGS_CACHE_TTL_MS - 1));
    expect(repository.listFinanceRows).toHaveBeenCalledTimes(1);
    await get.execute(new Date(t0.getTime() + SETTINGS_CACHE_TTL_MS + 1));
    expect(repository.listFinanceRows).toHaveBeenCalledTimes(2);
  });

  it("un changement est visible immédiatement dans ce processus (cache invalidé)", async () => {
    const { get, update } = setup();
    await get.execute();
    await update.execute({ retentionDays: 30 }, "a");
    expect((await get.execute()).retentionDays).toBe(30);
  });
});
