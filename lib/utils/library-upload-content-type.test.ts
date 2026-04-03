import { validatedLibraryUploadContentType } from "./library-upload-content-type";

describe("validatedLibraryUploadContentType", () => {
  it("returns application/pdf for application/pdf", () => {
    expect(validatedLibraryUploadContentType("application/pdf")).toBe(
      "application/pdf",
    );
  });

  it("normalizes casing", () => {
    expect(validatedLibraryUploadContentType("Application/PDF")).toBe(
      "application/pdf",
    );
  });

  it("defaults disallowed types to application/pdf", () => {
    expect(validatedLibraryUploadContentType("image/png")).toBe(
      "application/pdf",
    );
  });

  it("defaults empty or whitespace to application/pdf", () => {
    expect(validatedLibraryUploadContentType("")).toBe("application/pdf");
    expect(validatedLibraryUploadContentType("   ")).toBe("application/pdf");
    expect(validatedLibraryUploadContentType(undefined)).toBe(
      "application/pdf",
    );
  });
});
