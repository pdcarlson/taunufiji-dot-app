import { sanitizeLibraryUploadFilename } from "./sanitize-library-upload-filename";

describe("sanitizeLibraryUploadFilename", () => {
  it("preserves safe standardized exam-style names", () => {
    expect(sanitizeLibraryUploadFilename("CSCI1200_Exam1_Cutler_Spring_2025_Student.pdf")).toBe(
      "CSCI1200_Exam1_Cutler_Spring_2025_Student.pdf",
    );
  });

  it("maps spaces and odd characters to single underscores", () => {
    expect(sanitizeLibraryUploadFilename("CSCI1200 Exam1.pdf")).toBe("CSCI1200_Exam1.pdf");
  });

  it("uses basename only and strips traversal", () => {
    expect(sanitizeLibraryUploadFilename("../../../etc/passwd.pdf")).toBe("passwd.pdf");
  });

  it("decodes percent-encoded slashes before taking basename", () => {
    expect(sanitizeLibraryUploadFilename("x%2F..%2F..%2Fsecret.pdf")).toBe("secret.pdf");
  });

  it("returns a non-empty fallback when nothing safe remains", () => {
    const out = sanitizeLibraryUploadFilename("..../");
    expect(out).toMatch(/^upload-[0-9a-f-]{36}\.pdf$/i);
  });

  it("removes null bytes", () => {
    expect(sanitizeLibraryUploadFilename("foo\0bar.pdf")).toBe("foobar.pdf");
  });

  it("strips ASCII control characters", () => {
    expect(sanitizeLibraryUploadFilename("foo\x01\x1Fbar.pdf")).toBe(
      "foobar.pdf",
    );
    expect(sanitizeLibraryUploadFilename("foo\x7Fbar.pdf")).toBe("foobar.pdf");
  });

  it("truncates basenames longer than 200 characters", () => {
    const long = `${"a".repeat(250)}.pdf`;
    const out = sanitizeLibraryUploadFilename(long);
    expect(out.length).toBeLessThanOrEqual(200);
  });

  it("collapses consecutive dots to a single underscore", () => {
    expect(sanitizeLibraryUploadFilename("foo..bar.pdf")).toBe("foo_bar.pdf");
  });

  it("collapses consecutive hyphens", () => {
    expect(sanitizeLibraryUploadFilename("foo---bar.pdf")).toBe("foo-bar.pdf");
  });
});
