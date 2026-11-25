import { fetchImageSafely, isPublicAddress, isSupportedImage } from "./safe-image-fetcher";

describe("isPublicAddress", () => {
  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])("accepte %s", (ip) =>
    expect(isPublicAddress(ip)).toBe(true),
  );

  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "pas-une-ip",
  ])("refuse %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
});

describe("isSupportedImage", () => {
  it("reconnaît PNG et JPEG par leur signature, refuse le reste", () => {
    expect(isSupportedImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(true);
    expect(isSupportedImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isSupportedImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(false);
    expect(isSupportedImage(Buffer.from("GIF89a...."))).toBe(false);
  });
});

describe("fetchImageSafely", () => {
  it.each([
    "http://127.0.0.1/a.png",
    "http://localhost/a.png",
    "http://[::1]/a.png",
    "http://169.254.169.254/latest",
    "file:///etc/passwd",
    "ftp://exemple.test/a.png",
    "pas une url",
  ])("refuse %s sans requête externe", async (url) => {
    await expect(fetchImageSafely(url)).resolves.toBeNull();
  });
});
