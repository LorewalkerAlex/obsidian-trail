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
    "plugin-rebuild/tsconfig.json",
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
            "vitest.rebuild.config.ts",
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
    files: ["plugin-rebuild/src/**/*.ts", "plugin-rebuild/src/**/*.tsx"],
    ignores: [
      "plugin-rebuild/src/**/*.test.ts",
      "plugin-rebuild/src/**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/plugin/src/**"],
              message: "The clean rebuild must never depend on production code from the legacy plugin tree.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/domain/**/*.ts"],
    ignores: [
      "plugin-rebuild/src/domain/**/*.test.ts",
      "plugin-rebuild/src/domain/planning/**/*.ts",
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
                "**/plugin/src/**",
              ],
              message: "Rebuild Domain facts, validation, and rules must remain independent of technical mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/domain/planning/**/*.ts"],
    ignores: ["plugin-rebuild/src/domain/planning/**/*.test.ts"],
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
                "**/plugin/src/**",
              ],
              message: "Semantic planning may use the logical Mutation Plan contract, but not mutation execution or other technical layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/application/**/*.ts"],
    ignores: ["plugin-rebuild/src/application/**/*.test.ts"],
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
                "**/plugin/src/**",
              ],
              message: "Rebuild Application owns use-case orchestration, not host or raw persistence mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/runtime/**/*.ts"],
    ignores: ["plugin-rebuild/src/runtime/**/*.test.ts"],
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
                "**/plugin/src/**",
              ],
              message: "Rebuild Runtime owns state projection and must not depend on higher layers or Markdown mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/mutation/**/*.ts"],
    ignores: ["plugin-rebuild/src/mutation/**/*.test.ts"],
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
                "**/plugin/src/**",
              ],
              message: "Rebuild Mutation owns the mutation lifecycle and must not depend on higher layers or host adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/mutation/execution/**/*.ts"],
    ignores: ["plugin-rebuild/src/mutation/execution/**/*.test.ts"],
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
                "**/plugin/src/**",
              ],
              message: "Rebuild Mutation execution must use persistence capabilities, not Markdown or higher-layer mechanisms.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/source-sync/**/*.ts"],
    ignores: ["plugin-rebuild/src/source-sync/**/*.test.ts"],
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
                "**/plugin/src/**",
              ],
              message: "Rebuild Source Sync stays host-agnostic and below Application/UI.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["plugin-rebuild/src/ui/**/*.ts", "plugin-rebuild/src/ui/**/*.tsx"],
    ignores: [
      "plugin-rebuild/src/ui/**/*.test.ts",
      "plugin-rebuild/src/ui/**/*.test.tsx",
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
                "**/plugin/src/**",
              ],
              message: "Rebuild UI reads Runtime/query state and emits Application intents only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "plugin/src/test/trail-architecture-guard.test.ts",
      "plugin-rebuild/src/test/**/*.ts",
    ],
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
