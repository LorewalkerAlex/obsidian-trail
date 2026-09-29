import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      obsidian: new URL("./plugin/src/test/obsidian-runtime-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./plugin/src/test/setup.ts"],
    include: [
      "plugin/src/**/*.test.ts",
      "plugin/src/**/*.test.tsx",
    ],
    maxWorkers: "50%",
    clearMocks: true,
    restoreMocks: true,
  },
});
