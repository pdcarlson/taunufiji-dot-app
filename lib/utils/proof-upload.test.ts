import {
  adHocProofKeyPrefix,
  isProofKeyUnder,
  resolveProofContentType,
  taskProofKeyPrefix,
} from "./proof-upload";

describe("resolveProofContentType", () => {
  it("keeps the browser's image type", () => {
    expect(resolveProofContentType("a.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(resolveProofContentType("a.png", " IMAGE/PNG ")).toBe("image/png");
  });

  it("falls back to the extension when the browser reports no type", () => {
    expect(resolveProofContentType("IMG_1.HEIC", "")).toBe("image/heic");
    expect(resolveProofContentType("x.jpeg", "")).toBe("image/jpeg");
  });

  it("refuses SVG, non-images, and unknown extensions", () => {
    expect(() => resolveProofContentType("a.svg", "image/svg+xml")).toThrow(
      "Proof must be a photo",
    );
    expect(() => resolveProofContentType("a.pdf", "application/pdf")).toThrow(
      "Proof must be a photo",
    );
    expect(() => resolveProofContentType("a.txt", "")).toThrow(
      "Proof must be a photo",
    );
    expect(() => resolveProofContentType("noext", "")).toThrow(
      "Proof must be a photo",
    );
  });
});

describe("isProofKeyUnder", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a key issued under the prefix", () => {
    const prefix = taskProofKeyPrefix("task_1");
    expect(isProofKeyUnder(`${prefix}${uuid}/image.jpg`, prefix)).toBe(true);
  });

  it("rejects keys outside the prefix or with extra path segments", () => {
    const prefix = adHocProofKeyPrefix("d1");
    expect(isProofKeyUnder(`proofs/adhoc/d2/${uuid}/a.jpg`, prefix)).toBe(false);
    expect(isProofKeyUnder(`${prefix}${uuid}/../x/a.jpg`, prefix)).toBe(false);
    expect(isProofKeyUnder(`${prefix}${uuid}/a..jpg`, prefix)).toBe(false);
    expect(isProofKeyUnder(`${prefix}not-a-uuid/a.jpg`, prefix)).toBe(false);
    expect(isProofKeyUnder(prefix, prefix)).toBe(false);
  });
});
