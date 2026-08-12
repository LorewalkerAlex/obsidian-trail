import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./plugin/src/test/setup.ts"],
    include: [
      "plugin/src/**/*.test.ts",
      "plugin/src/**/*.test.tsx",
    ],
    clearMocks: true,
    restoreMocks: true,
  },
});
