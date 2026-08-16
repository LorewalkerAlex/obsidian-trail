import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const LEGACY_SOURCE_ROOT = join(process.cwd(), "plugin", "src");
const REBUILD_SOURCE_ROOT = join(process.cwd(), "plugin-rebuild", "src");
const SOURCE_EXTENSION = /\.(?:ts|tsx)$/;
const IMPORT_SOURCE = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
const LEGACY_PLUGIN_SOURCE = /(?:^|\/)plugin\/src(?:\/|$)/;
const REBUILD_PLUGIN_SOURCE = /(?:^|\/)plugin-rebuild\/src(?:\/|$)/;

/** Recursively enumerates rebuild TypeScript sources for repository-boundary conformance checks. */
function collectSourceFiles(directory: string): readonly string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectSourceFiles(absolute));
    } else if (SOURCE_EXTENSION.test(entry.name)) {
      result.push(absolute);
    }
  }
  return result;
}

/** Extracts static and dynamic import specifiers without evaluating the source. */
function importedSources(source: string): readonly string[] {
  const result: string[] = [];
  for (const match of source.matchAll(IMPORT_SOURCE)) {
    if (match[1]) {
      result.push(match[1]);
    }
  }
  return result;
}

/** Returns cross-tree imports so both implementations remain independently ownable. */
function crossTreeImports(
  sourceRoot: string,
  forbiddenSource: RegExp,
): readonly string[] {
  const violations: string[] = [];
  for (const file of collectSourceFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    for (const importSource of importedSources(source)) {
      if (forbiddenSource.test(importSource.replaceAll("\\", "/"))) {
        violations.push(`${relative(process.cwd(), file)} -> ${importSource}`);
      }
    }
  }
  return violations;
}

describe("plugin rebuild isolation", () => {
  it("never imports production code from the legacy plugin tree", () => {
    expect(crossTreeImports(REBUILD_SOURCE_ROOT, LEGACY_PLUGIN_SOURCE)).toEqual([]);
  });

  it("keeps the runnable legacy plugin independent from the rebuild tree", () => {
    expect(crossTreeImports(LEGACY_SOURCE_ROOT, REBUILD_PLUGIN_SOURCE)).toEqual([]);
  });
});
