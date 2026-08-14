import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig(
  globalIgnores([
    "node_modules/**",
    "coverage/**",
    ".obsidian/**",
    "archive/**",
    "esbuild.config.mjs",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        __TRAIL_DIAGNOSTICS_ENABLED__: "readonly",
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.mts",
            "manifest.json",
            "vitest.config.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"],
      },
    },
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["plugin/src/runtime/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/markdown/**"],
              message: "Runtime must consume logical source contracts, not Markdown mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/mutation/execution/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/markdown/**"],
              message: "Mutation execution must use persistence capabilities, not Markdown mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["eslint.config.mts"],
    rules: {
      "obsidianmd/hardcoded-config-path": "off",
    },
  },
);
