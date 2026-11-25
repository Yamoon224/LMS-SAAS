import { ProgressState } from "./progress-state";
import { Progress, type ProgressProps } from "./progress.entity";

function buildProgress(overrides: Partial<ProgressProps> = {}): Progress {
  const props: ProgressProps = {
    id: "prog-1",
    enrollmentId: "enr-1",
    lessonId: "lesson-1",
    state: ProgressState.NOT_STARTED,
    watchedPercent: null,
    opened: false,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
  return Progress.fromPersistence(props);
}

describe("Progress", () => {
  describe("recordView (PUB-09/ENT-25)", () => {
    it("marque opened et passe en IN_PROGRESS depuis NOT_STARTED", () => {
      const progress = buildProgress();
      progress.recordView();
      expect(progress.opened).toBe(true);
      expect(progress.state).toBe(ProgressState.IN_PROGRESS);
      expect(progress.toSnapshot().startedAt).not.toBeNull();
    });

    it("enregistre le pourcentage visionné quand fourni", () => {
      const progress = buildProgress();
      progress.recordView(42);
      expect(progress.watchedPercent).toBe(42);
    });

    it("ne régresse pas un état déjà COMPLETED", () => {
      const progress = buildProgress({ state: ProgressState.COMPLETED });
      progress.recordView(10);
      expect(progress.state).toBe(ProgressState.COMPLETED);
    });

    it("ne réinitialise pas startedAt si déjà défini", () => {
      const existingStart = new Date("2026-01-01T00:00:00Z");
      const progress = buildProgress({ startedAt: existingStart, state: ProgressState.IN_PROGRESS });
      progress.recordView();
      expect(progress.toSnapshot().startedAt).toEqual(existingStart);
    });
  });

  describe("markCompleted", () => {
    it("passe l'état à COMPLETED et fixe completedAt", () => {
      const progress = buildProgress({ state: ProgressState.IN_PROGRESS });
      progress.markCompleted();
      expect(progress.state).toBe(ProgressState.COMPLETED);
      expect(progress.toSnapshot().completedAt).not.toBeNull();
    });

    it("ne réécrit pas completedAt si déjà fixé", () => {
      const existing = new Date("2026-01-01T00:00:00Z");
      const progress = buildProgress({ state: ProgressState.IN_PROGRESS, completedAt: existing });
      progress.markCompleted();
      expect(progress.toSnapshot().completedAt).toEqual(existing);
    });
  });
});

describe("Progress accessors", () => {
  it("expose lessonId, état, pourcentage et ouverture", () => {
    const progress = buildProgress({ lessonId: "lesson-9", watchedPercent: 55, opened: true, state: ProgressState.IN_PROGRESS });
    expect(progress.lessonId).toBe("lesson-9");
    expect(progress.state).toBe(ProgressState.IN_PROGRESS);
    expect(progress.watchedPercent).toBe(55);
    expect(progress.opened).toBe(true);
  });
});
