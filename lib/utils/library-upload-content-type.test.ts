import { validatedLibraryUploadContentType } from "./library-upload-content-type";

describe("validatedLibraryUploadContentType", () => {
  it("always returns application/pdf for library uploads", () => {
    expect(validatedLibraryUploadContentType()).toBe("application/pdf");
  });
});
