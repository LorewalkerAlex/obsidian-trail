import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./plugin/src/test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
