import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./plugin-rebuild/src/test/setup.ts"],
    include: [
      "plugin-rebuild/src/**/*.test.ts",
      "plugin-rebuild/src/**/*.test.tsx",
    ],
    clearMocks: true,
    restoreMocks: true,
  },
});
