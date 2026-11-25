import type { MediaFacade } from "@modules/media/media.facade";
import { NotFoundDomainError } from "@shared/errors";

import { InvalidLessonContentError, Lesson } from "../domain/lesson.entity";
import type { LessonRepositoryPort } from "../domain/lesson.repository.port";
import { ResourceType } from "../domain/resource-type";

import { LessonMediaUseCase } from "./lesson-media.use-case";

const MEDIA_ID = "3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f";
const OTHER_MEDIA_ID = "aaaaaaaa-5d4a-4e6b-9c7d-1a2b3c4d5e6f";

function buildLesson(resourceType: ResourceType, storageUrl: string | null): Lesson {
  return Lesson.fromPersistence({
    id: "lesson-1",
    moduleId: "module-1",
    title: "Leçon",
    order: 0,
    contentHtml: null,
    resourceType,
    storageUrl,
    isMandatory: true,
    completionCriteria: null,
    downloadAllowed: false,
  });
}

function build(lesson: Lesson | null, media: unknown = { kind: "VIDEO", mimeType: "video/mp4", status: "READY" }) {
  const lessons = {
    findById: jest.fn().mockResolvedValue(lesson),
    update: jest.fn(),
  } as unknown as LessonRepositoryPort;
  const mediaFacade = {
    getAssetInTenant: jest.fn().mockImplementation(() =>
      media === null ? Promise.reject(new NotFoundDomainError("Asset média introuvable")) : Promise.resolve(media),
    ),
    deleteAsset: jest.fn(),
  } as unknown as MediaFacade;
  return { useCase: new LessonMediaUseCase(lessons, mediaFacade), lessons, mediaFacade };
}

describe("LessonMediaUseCase - attaching a media (ENT-24)", () => {
  it("attaches a media of the caller's tenant that fits the lesson type", async () => {
    const { useCase, mediaFacade } = build(null);
    await expect(useCase.assertValidForCreate(ResourceType.VIDEO, MEDIA_ID, "tenant-1")).resolves.toBeUndefined();
    expect(mediaFacade.getAssetInTenant).toHaveBeenCalledWith(MEDIA_ID, "tenant-1");
  });

  it("answers 404 for a media of another tenant (indistinguishable from an unknown one)", async () => {
    const { useCase } = build(null, null);
    await expect(useCase.assertValidForCreate(ResourceType.VIDEO, MEDIA_ID, "tenant-A")).rejects.toThrow(NotFoundDomainError);
  });

  it("refuses a media of the wrong kind, a failed one, and a raw storage key", async () => {
    await expect(
      build(null, { kind: "AUDIO", mimeType: "audio/mpeg", status: "READY" }).useCase.assertValidForCreate(ResourceType.VIDEO, MEDIA_ID, "t"),
    ).rejects.toThrow(InvalidLessonContentError);
    await expect(
      build(null, { kind: "VIDEO", mimeType: "video/mp4", status: "REJECTED" }).useCase.assertValidForCreate(ResourceType.VIDEO, MEDIA_ID, "t"),
    ).rejects.toThrow(InvalidLessonContentError);
    await expect(
      build(null).useCase.assertValidForCreate(ResourceType.VIDEO, "tenants/other/secret.mp4", "t"),
    ).rejects.toThrow(InvalidLessonContentError);
  });

  it("refuses an http or javascript external link", async () => {
    const { useCase } = build(null);
    await expect(useCase.assertValidForCreate(ResourceType.LINK, "http://example.com", "t")).rejects.toThrow(InvalidLessonContentError);
    await expect(useCase.assertValidForCreate(ResourceType.LINK, "javascript:alert(1)", "t")).rejects.toThrow(InvalidLessonContentError);
    await expect(useCase.assertValidForCreate(ResourceType.LINK, "https://example.com/x", "t")).resolves.toBeUndefined();
  });
});

describe("LessonMediaUseCase - updating, removing", () => {
  it("returns the previous media id when it is replaced, and null when unchanged or untouched", async () => {
    const lesson = buildLesson(ResourceType.VIDEO, OTHER_MEDIA_ID);
    const { useCase } = build(lesson);
    expect(await useCase.assertValidForUpdate("lesson-1", MEDIA_ID, "t")).toBe(OTHER_MEDIA_ID);
    expect(await useCase.assertValidForUpdate("lesson-1", OTHER_MEDIA_ID, "t")).toBeNull();
    expect(await useCase.assertValidForUpdate("lesson-1", undefined, "t")).toBeNull();
  });

  it("validates against the immutable type of the existing lesson", async () => {
    const { useCase } = build(buildLesson(ResourceType.TEXT, null));
    await expect(useCase.assertValidForUpdate("lesson-1", MEDIA_ID, "t")).rejects.toThrow(InvalidLessonContentError);
  });

  it("removes the file from the lesson then frees the storage", async () => {
    const { useCase, lessons, mediaFacade } = build(buildLesson(ResourceType.VIDEO, MEDIA_ID));
    await useCase.removeMedia("lesson-1", "tenant-1");
    expect(lessons.update).toHaveBeenCalledWith("lesson-1", { storageUrl: null });
    expect(mediaFacade.deleteAsset).toHaveBeenCalledWith(MEDIA_ID, "tenant-1");
  });

  it("does not fail the operation when the storage cannot be freed", async () => {
    const { useCase, mediaFacade } = build(buildLesson(ResourceType.VIDEO, MEDIA_ID));
    (mediaFacade.deleteAsset as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(useCase.release(MEDIA_ID, "t")).resolves.toBeUndefined();
  });

  it("shows the media state (transcoding, ready...) in the detail, and tolerates a vanished media", async () => {
    const view = { mediaAssetId: MEDIA_ID, kind: "VIDEO", status: "PROCESSING" };
    const { useCase } = build(buildLesson(ResourceType.VIDEO, MEDIA_ID), view);
    expect((await useCase.getDetail("lesson-1", "t")).media).toEqual(view);

    const gone = build(buildLesson(ResourceType.VIDEO, MEDIA_ID), null);
    expect((await gone.useCase.getDetail("lesson-1", "t")).media).toBeNull();
  });
});

describe("LessonMediaUseCase - lookups and error paths", () => {
  it("finds the media id of a lesson with an attached media", async () => {
    const { useCase } = build(buildLesson(ResourceType.VIDEO, MEDIA_ID));
    await expect(useCase.findMediaId("lesson-1")).resolves.toBe(MEDIA_ID);
  });

  it("finds no media id for an external link, an empty lesson or an unknown lesson", async () => {
    await expect(build(buildLesson(ResourceType.LINK, "https://example.com/x")).useCase.findMediaId("l")).resolves.toBeNull();
    await expect(build(buildLesson(ResourceType.TEXT, null)).useCase.findMediaId("l")).resolves.toBeNull();
    await expect(build(null).useCase.findMediaId("l")).resolves.toBeNull();
  });

  it("ignores an unreadable legacy storage value when finding the media id", async () => {
    const { useCase } = build(buildLesson(ResourceType.DOCUMENT, "legacy/raw-key.pdf"));
    await expect(useCase.findMediaId("lesson-1")).resolves.toBeNull();
  });

  it("raises NotFound when the lesson is unknown for an update, a detail or a media removal", async () => {
    const { useCase, lessons } = build(null);
    await expect(useCase.assertValidForUpdate("nope", MEDIA_ID, "t")).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.getDetail("nope", "t")).rejects.toThrow(NotFoundDomainError);
    await expect(useCase.removeMedia("nope", "t")).rejects.toThrow(NotFoundDomainError);
    expect(lessons.update).not.toHaveBeenCalled();
  });

  it("returns no previous media when the replaced storage was an external link or empty", async () => {
    const link = build(buildLesson(ResourceType.LINK, "https://example.com/a")).useCase;
    await expect(link.assertValidForUpdate("lesson-1", "https://example.com/b", "t")).resolves.toBeNull();
    const empty = build(buildLesson(ResourceType.VIDEO, null)).useCase;
    await expect(empty.assertValidForUpdate("lesson-1", MEDIA_ID, "t")).resolves.toBeNull();
  });

  it("returns a null media in the detail when the lesson has none, and rethrows unexpected media errors", async () => {
    const none = build(buildLesson(ResourceType.TEXT, null));
    await expect(none.useCase.getDetail("lesson-1", "t")).resolves.toMatchObject({ media: null });

    const failing = build(buildLesson(ResourceType.VIDEO, MEDIA_ID));
    (failing.mediaFacade.getAssetInTenant as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(failing.useCase.getDetail("lesson-1", "t")).rejects.toThrow("boom");
  });

  it("removes a lesson file without freeing storage when it was an external link", async () => {
    const { useCase, lessons, mediaFacade } = build(buildLesson(ResourceType.LINK, "https://example.com/a"));
    await useCase.removeMedia("lesson-1", "t");
    expect(lessons.update).toHaveBeenCalledWith("lesson-1", { storageUrl: null });
    expect(mediaFacade.deleteAsset).not.toHaveBeenCalled();
  });
});

