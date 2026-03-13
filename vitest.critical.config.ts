import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        "lib/presentation/utils/action-handler.test.ts",
        "lib/presentation/actions/housing/admin.actions.test.ts",
        "lib/presentation/actions/housing/schedule.actions.test.ts",
      ],
      coverage: {
        enabled: true,
        provider: "v8",
        reporter: ["text", "json-summary"],
        include: [
          "lib/presentation/utils/action-handler.ts",
          "lib/presentation/actions/housing/admin.actions.ts",
          "lib/presentation/actions/housing/schedule.actions.ts",
        ],
        thresholds: {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 80,
        },
      },
    },
  }),
);
