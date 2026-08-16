import {
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  join,
  relative,
  sep,
} from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(process.cwd(), "plugin", "src");
const PATH_AUTHORITY = join(
  SOURCE_ROOT,
  "markdown",
  "schema",
  "trail-paths.ts",
);
const ARCHITECTURE_GUARD = join(
  SOURCE_ROOT,
  "test",
  "trail-architecture-guard.test.ts",
);

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectTypeScriptFiles(path);
      }
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path)
    || path.includes(`${sep}test${sep}`)
    || path.endsWith(".d.ts");
}

function repoRelative(path: string): string {
  return relative(process.cwd(), path).split(sep).join("/");
}

function syntaxTokens(path: string): string[] {
  const source = readFileSync(path, "utf8");
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const tokens: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) {
      tokens.push(node.text);
    } else if (ts.isTemplateExpression(node)) {
      tokens.push(node.head.text);
      node.templateSpans.forEach((span) => tokens.push(span.literal.text));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return tokens;
}

describe("Trail architecture guards", () => {
  const allSourceFiles = collectTypeScriptFiles(SOURCE_ROOT);
  const productionFiles = allSourceFiles.filter((path) => !isTestFile(path));

  it("keeps migration-stage identity out of production symbols and runtime text", () => {
    const stageLanguage = [
      /\bFormal\b/,
      /[A-Za-z]Formal[A-Z]/,
      /formal-/,
      /invalidFormal/,
      /createFormal/,
      /validateFormal/,
      /\bPOC\b/,
      /\bTransitional\b/,
      /current slice/i,
    ];
    const violations = productionFiles.flatMap((path) => {
      const tokens = syntaxTokens(path);
      return stageLanguage.flatMap((pattern) =>
        tokens
          .filter((token) => pattern.test(token))
          .map((token) => `${repoRelative(path)} :: ${token}`),
      );
    });

    expect(violations).toEqual([]);
  });

  it("keeps managed Trail path literals inside the canonical path authority", () => {
    const violations = productionFiles
      .filter((path) => path !== PATH_AUTHORITY)
      .filter((path) => syntaxTokens(path).some((token) => token.includes("Trail/")))
      .map(repoRelative);

    expect(violations).toEqual([]);
  });

  it("keeps retired owners and technology spikes out of the active tree", () => {
    const retiredActiveFiles = allSourceFiles
      .map(repoRelative)
      .filter((path) =>
        path.startsWith("plugin/src/application/workspace/")
        || path.startsWith("plugin/src/formal-validation/"),
      );
    const benchmarkFiles = allSourceFiles
      .filter((path) => /\.bench\.tsx?$/.test(path))
      .map(repoRelative);
    const oldOwnerImports = allSourceFiles
      .filter((path) => path !== ARCHITECTURE_GUARD)
      .filter((path) => readFileSync(path, "utf8").includes(
        "application/workspace/trail-workspace",
      ))
      .map(repoRelative);

    expect(retiredActiveFiles).toEqual([]);
    expect(benchmarkFiles).toEqual([]);
    expect(oldOwnerImports).toEqual([]);
  });
});
