import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig(
  globalIgnores([
    "node_modules/**",
    "coverage/**",
    ".obsidian/**",
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
    ignores: [
      "plugin/src/domain/**/*.test.ts",
      "plugin/src/domain/planning/**/*.ts",
    ],
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
              message: "Domain facts, validation, and rules must remain independent of technical mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/domain/planning/**/*.ts"],
    ignores: ["plugin/src/domain/planning/**/*.test.ts"],
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
                "**/persistence/**",
                "**/runtime/**",
                "**/source-sync/**",
                "**/ui/**",
                "**/mutation/coordinator/**",
                "**/mutation/queue/**",
                "**/mutation/physical/**",
                "**/mutation/execution/**",
              ],
              message: "Semantic planning may use the logical Mutation Plan contract, but not mutation execution or other technical layers.",
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
              message: "Application owns use-case orchestration, not host or raw persistence mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/markdown/**/*.ts"],
    ignores: ["plugin/src/markdown/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/adapters/**",
                "**/application/**",
                "**/diagnostics/**",
                "**/mutation/**",
                "**/persistence/**",
                "**/query/**",
                "**/runtime/**",
                "**/source-sync/**",
                "**/ui/**",
              ],
              message: "Markdown owns physical grammar and must not depend on persistence or higher layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/persistence/**/*.ts"],
    ignores: ["plugin/src/persistence/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/adapters/**",
                "**/application/**",
                "**/diagnostics/**",
                "**/mutation/**",
                "**/query/**",
                "**/runtime/**",
                "**/source-sync/**",
                "**/ui/**",
              ],
              message: "Persistence owns authoritative carriers and must not depend on higher layers or host adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/runtime/**/*.ts"],
    ignores: ["plugin/src/runtime/**/*.test.ts"],
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
                "**/source-sync/**",
                "**/ui/**",
              ],
              message: "Runtime owns state projection and must not depend on higher layers or Markdown mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/mutation/**/*.ts"],
    ignores: ["plugin/src/mutation/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/adapters/**",
                "**/application/**",
                "**/source-sync/**",
                "**/ui/**",
              ],
              message: "Mutation owns the mutation lifecycle and must not depend on higher layers or host adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/mutation/execution/**/*.ts"],
    ignores: ["plugin/src/mutation/execution/**/*.test.ts"],
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
                "**/source-sync/**",
                "**/ui/**",
              ],
              message: "Mutation execution must use persistence capabilities, not Markdown or higher-layer mechanisms.",
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
              group: [
                "**/adapters/**",
                "**/application/**",
                "**/ui/**",
              ],
              message: "Source Sync stays host-agnostic and below Application/UI.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/ui/**/*.ts", "plugin/src/ui/**/*.tsx"],
    ignores: [
      "plugin/src/ui/**/*.test.ts",
      "plugin/src/ui/**/*.test.tsx",
    ],
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
              message: "UI reads Runtime/query state and emits Application intents only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin/src/test/**/*.ts", "plugin/src/test/**/*.tsx"],
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
