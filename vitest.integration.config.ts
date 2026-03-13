import { mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(baseConfig, {
  test: {
    include: ["lib/presentation/**/*.test.ts"],
  },
});
