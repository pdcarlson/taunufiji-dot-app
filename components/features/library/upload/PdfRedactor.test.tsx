import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import PdfRedactor from "./PdfRedactor";

// Mock pdfjs-dist and pdf-lib
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() =>
        Promise.resolve({
          getViewport: vi.fn(() => ({ width: 600, height: 800 })),
          render: vi.fn(() => ({
            promise: Promise.resolve(),
            cancel: vi.fn(),
          })),
        }),
      ),
    }),
  })),
  GlobalWorkerOptions: { workerSrc: "" },
  version: "5.4.530",
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: vi.fn(async () => ({
      numPages: 1,
      getPage: vi.fn(),
      addPage: vi.fn(() => ({ drawImage: vi.fn() })),
      save: vi.fn(async () => new Uint8Array()),
      embedPng: vi.fn(async () => ({})),
    })),
  },
}));

describe("PdfRedactor initialization/rendering", () => {
  it("should initialize correctly with a file", async () => {
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    render(<PdfRedactor file={file} />);

    await waitFor(() => {
      expect(file.arrayBuffer).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(document.querySelector("canvas")).not.toBeNull();
    });
  });

  // Since actual canvas interaction is hard to test in JSDOM, this suite focuses
  // on the component load/render lifecycle.
});
