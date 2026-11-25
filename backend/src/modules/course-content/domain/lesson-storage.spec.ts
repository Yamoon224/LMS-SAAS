import { assertMediaFitsResourceType, assertStorageRefFitsResourceType, parseLessonStorage } from "./lesson-storage";
import { InvalidLessonContentError } from "./lesson.entity";
import { ResourceType } from "./resource-type";

const UUID = "3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f";

describe("parseLessonStorage", () => {
  it("treats empty values as no resource", () => {
    expect(parseLessonStorage(undefined)).toEqual({ kind: "NONE" });
    expect(parseLessonStorage("   ")).toEqual({ kind: "NONE" });
  });

  it("recognizes a media identifier and an https URL", () => {
    expect(parseLessonStorage(UUID)).toEqual({ kind: "MEDIA", mediaAssetId: UUID });
    expect(parseLessonStorage("https://cdn.example.com/doc.pdf")).toEqual({
      kind: "EXTERNAL",
      url: "https://cdn.example.com/doc.pdf",
    });
  });

  it.each([
    "http://example.com/a.pdf",
    "javascript:alert(1)",
    "data:text/html;base64,AAAA",
    "tenants/abc/raw-s3-key.pdf",
    "https://exa mple.com",
    `https://example.com/${"a".repeat(2100)}`,
  ])("rejects %s", (value) => {
    expect(() => parseLessonStorage(value)).toThrow(InvalidLessonContentError);
  });
});

describe("assertStorageRefFitsResourceType", () => {
  it("refuses a resource on a text lesson", () => {
    expect(() => assertStorageRefFitsResourceType(ResourceType.TEXT, { kind: "MEDIA", mediaAssetId: UUID })).toThrow(
      InvalidLessonContentError,
    );
  });

  it("only accepts an external URL on a link lesson, and a media elsewhere", () => {
    expect(() => assertStorageRefFitsResourceType(ResourceType.LINK, { kind: "MEDIA", mediaAssetId: UUID })).toThrow();
    expect(() => assertStorageRefFitsResourceType(ResourceType.VIDEO, { kind: "EXTERNAL", url: "https://x.io/v" })).toThrow();
    expect(() => assertStorageRefFitsResourceType(ResourceType.LINK, { kind: "EXTERNAL", url: "https://x.io/v" })).not.toThrow();
    expect(() => assertStorageRefFitsResourceType(ResourceType.VIDEO, { kind: "MEDIA", mediaAssetId: UUID })).not.toThrow();
  });
});

describe("assertMediaFitsResourceType", () => {
  const ready = { status: "READY" };

  it("accepts a matching kind, even while the file is still being processed", () => {
    expect(() => assertMediaFitsResourceType(ResourceType.VIDEO, { kind: "VIDEO", mimeType: "video/mp4", status: "PROCESSING" })).not.toThrow();
    expect(() => assertMediaFitsResourceType(ResourceType.PDF, { kind: "DOCUMENT", mimeType: "application/pdf", ...ready })).not.toThrow();
  });

  it("refuses a mismatching kind (audio on a video lesson, Word file on a PDF lesson)", () => {
    expect(() => assertMediaFitsResourceType(ResourceType.VIDEO, { kind: "AUDIO", mimeType: "audio/mpeg", ...ready })).toThrow(
      InvalidLessonContentError,
    );
    expect(() =>
      assertMediaFitsResourceType(ResourceType.PDF, { kind: "DOCUMENT", mimeType: "application/msword", ...ready }),
    ).toThrow(InvalidLessonContentError);
  });

  it.each(["UPLOADING", "FAILED", "REJECTED"])("refuses a %s media", (status) => {
    expect(() => assertMediaFitsResourceType(ResourceType.AUDIO, { kind: "AUDIO", mimeType: "audio/mpeg", status })).toThrow(
      InvalidLessonContentError,
    );
  });

  it("refuses an uploaded file on text and link lessons", () => {
    expect(() => assertMediaFitsResourceType(ResourceType.TEXT, { kind: "IMAGE", mimeType: "image/png", ...ready })).toThrow();
    expect(() => assertMediaFitsResourceType(ResourceType.LINK, { kind: "IMAGE", mimeType: "image/png", ...ready })).toThrow();
  });
});
