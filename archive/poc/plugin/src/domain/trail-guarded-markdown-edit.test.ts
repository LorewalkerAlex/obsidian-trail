import { describe, expect, it } from "vitest";

import type { TrailSourceRange } from "./trail-model";
import {
  applyGuardedMarkdownEdit,
  replaceMarkdownRange,
} from "./trail-guarded-markdown-edit";

interface FixtureTarget {
  id: string;
  source: TrailSourceRange;
}

function locateTarget(markdown: string): FixtureTarget {
  const marker = "target:";
  const startOffset = markdown.indexOf(marker);

  if (startOffset < 0) {
    throw new Error("target missing");
  }

  const newlineOffset = markdown.indexOf("\n", startOffset);
  const endOffset = newlineOffset < 0
    ? markdown.length
    : newlineOffset;

  return {
    id: "target",
    source: {
      filePath: "fixture.md",
      startOffset,
      endOffset,
      fingerprint: markdown.slice(startOffset, endOffset),
    },
  };
}

describe("guarded Markdown edit", () => {
  it("relocates the target before applying a region edit", () => {
    const original = "before\ntarget: old\nafter\n";
    const expected = locateTarget(original);
    const moved = `inserted\n${original}`;

    const updated = applyGuardedMarkdownEdit({
      markdown: moved,
      expectedFingerprint: expected.source.fingerprint,
      missingFingerprintError: () => new Error("missing fingerprint"),
      locateLatest: locateTarget,
      conflictError: () => new Error("conflict"),
      buildEdit: (latest) => ({
        startOffset: latest.source.startOffset,
        endOffset: latest.source.endOffset,
        replacement: "target: new",
      }),
    });

    expect(updated).toBe(
      "inserted\nbefore\ntarget: new\nafter\n",
    );
  });

  it("rejects a changed target before building the edit", () => {
    const original = "target: old\n";
    const expected = locateTarget(original);
    const changed = "target: external\n";
    let editBuilt = false;

    expect(() => applyGuardedMarkdownEdit({
      markdown: changed,
      expectedFingerprint: expected.source.fingerprint,
      missingFingerprintError: () => new Error("missing fingerprint"),
      locateLatest: locateTarget,
      conflictError: () => new Error("conflict"),
      buildEdit: () => {
        editBuilt = true;
        return undefined;
      },
    })).toThrow("conflict");
    expect(editBuilt).toBe(false);
  });

  it("uses the caller's missing fingerprint error", () => {
    expect(() => applyGuardedMarkdownEdit({
      markdown: "target: old\n",
      expectedFingerprint: undefined,
      missingFingerprintError: () => new Error("domain missing"),
      locateLatest: locateTarget,
      conflictError: () => new Error("conflict"),
      buildEdit: () => undefined,
    })).toThrow("domain missing");
  });

  it("verifies only when a region edit is requested", () => {
    const markdown = "target: old\n";
    const expected = locateTarget(markdown);
    let verifyCount = 0;

    const unchanged = applyGuardedMarkdownEdit({
      markdown,
      expectedFingerprint: expected.source.fingerprint,
      missingFingerprintError: () => new Error("missing fingerprint"),
      locateLatest: locateTarget,
      conflictError: () => new Error("conflict"),
      buildEdit: () => undefined,
      verify: () => {
        verifyCount += 1;
      },
    });

    expect(unchanged).toBe(markdown);
    expect(verifyCount).toBe(0);

    const updated = applyGuardedMarkdownEdit({
      markdown,
      expectedFingerprint: expected.source.fingerprint,
      missingFingerprintError: () => new Error("missing fingerprint"),
      locateLatest: locateTarget,
      conflictError: () => new Error("conflict"),
      buildEdit: (latest) => ({
        startOffset: latest.source.startOffset,
        endOffset: latest.source.endOffset,
        replacement: "target: new",
      }),
      verify: () => {
        verifyCount += 1;
      },
    });

    expect(updated).toBe("target: new\n");
    expect(verifyCount).toBe(1);
  });

  it("rejects an invalid replacement range", () => {
    expect(() => replaceMarkdownRange(
      "abc",
      2,
      1,
      "x",
    )).toThrow(RangeError);
  });
});
