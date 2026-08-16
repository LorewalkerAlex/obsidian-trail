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
    files: ["plugin/src/domain/**/*.ts"],
    ignores: ["plugin/src/domain/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/adapters/**",
                "**/application/**",
                "**/markdown/**",
                "**/mutation/**",
                "**/persistence/**",
                "**/runtime/**",
                "**/source-sync/**",
                "**/ui/**",
              ],
              message: "Domain must remain independent of application and technical mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/application/**/*.ts"],
    ignores: ["plugin/src/application/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/adapters/**",
                "**/persistence/**",
                "**/markdown/codecs/**",
                "**/markdown/core/**",
              ],
              message: "Application must consume domain/capability contracts, not host or raw persistence mechanisms.",
            },
          ],
        },
      ],
    },
  },
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
    files: ["plugin/src/source-sync/**/*.ts"],
    ignores: ["plugin/src/source-sync/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/adapters/**"],
              message: "Source Sync must stay host-agnostic; host mechanics belong in adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/ui/**/*.ts", "plugin/src/ui/**/*.tsx"],
    ignores: ["plugin/src/ui/**/*.test.ts", "plugin/src/ui/**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/adapters/**",
                "**/markdown/**",
                "**/mutation/**",
                "**/persistence/**",
                "**/source-sync/**",
              ],
              message: "UI must read Runtime/query state and emit Application intents, not own technical mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/test/trail-architecture-guard.test.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
    },
  },
  {
    files: ["eslint.config.mts"],
    rules: {
      "obsidianmd/hardcoded-config-path": "off",
    },
  },
);
