import {
  assertWithinSizeLimit,
  assertWithinStorageQuota,
  MediaAssetKind,
  MediaTooLargeError,
  resolveMediaKind,
  StorageQuotaExceededError,
  UnsupportedMediaTypeError,
} from "./media-asset-kind";

describe("resolveMediaKind (BE-09 liste blanche)", () => {
  it.each([
    ["video/mp4", MediaAssetKind.VIDEO],
    ["audio/mpeg", MediaAssetKind.AUDIO],
    ["image/png", MediaAssetKind.IMAGE],
    ["application/pdf", MediaAssetKind.DOCUMENT],
  ])("resolves %s to %s", (mimeType, expectedKind) => {
    expect(resolveMediaKind(mimeType)).toBe(expectedKind);
  });

  it("rejects an unsupported MIME type", () => {
    expect(() => resolveMediaKind("application/x-msdownload")).toThrow(UnsupportedMediaTypeError);
  });
});

describe("assertWithinSizeLimit (BE-09 limites de taille)", () => {
  it("accepts a video just under the 2 GB limit", () => {
    expect(() => assertWithinSizeLimit(MediaAssetKind.VIDEO, 2 * 1024 * 1024 * 1024 - 1)).not.toThrow();
  });

  it("rejects a video over the 2 GB limit", () => {
    expect(() => assertWithinSizeLimit(MediaAssetKind.VIDEO, 2 * 1024 * 1024 * 1024 + 1)).toThrow(
      MediaTooLargeError,
    );
  });

  it("rejects an image over the 10 MB limit", () => {
    expect(() => assertWithinSizeLimit(MediaAssetKind.IMAGE, 11 * 1024 * 1024)).toThrow(
      MediaTooLargeError,
    );
  });

  it("accepts a document within the 50 MB limit", () => {
    expect(() => assertWithinSizeLimit(MediaAssetKind.DOCUMENT, 10 * 1024 * 1024)).not.toThrow();
  });
});

describe("assertWithinStorageQuota (ENT-24)", () => {
  const GB = 1024 * 1024 * 1024;

  it("accepts anything when the plan storage is unlimited", () => {
    expect(() => assertWithinStorageQuota(10 * GB, 50 * GB, null)).not.toThrow();
  });

  it("accepts a file that fits exactly and refuses one byte more", () => {
    expect(() => assertWithinStorageQuota(GB - 1, 1, 1)).not.toThrow();
    expect(() => assertWithinStorageQuota(GB - 1, 2, 1)).toThrow(StorageQuotaExceededError);
  });

  it("refuses everything for a zero quota (no active subscription)", () => {
    expect(() => assertWithinStorageQuota(0, 1, 0)).toThrow(StorageQuotaExceededError);
  });
});

describe("resolveMediaKind - downloadable resources", () => {
  it.each(["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"])(
    "accepts %s as a document",
    (mime) => expect(resolveMediaKind(mime)).toBe(MediaAssetKind.DOCUMENT),
  );

  it.each(["application/zip", "application/x-msdownload", "text/html", "image/svg+xml"])("rejects %s", (mime) =>
    expect(() => resolveMediaKind(mime)).toThrow(UnsupportedMediaTypeError),
  );
});
