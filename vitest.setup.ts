import { expect, vi } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Mock server-only to prevent it from throwing in tests
vi.mock("server-only", () => {
  return {};
});
