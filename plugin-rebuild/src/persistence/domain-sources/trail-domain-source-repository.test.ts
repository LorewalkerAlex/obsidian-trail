import { describe, expect, it } from "vitest";
import {
  TRAIL_TRIAGE_EMPTY_MARKDOWN,
} from "../../markdown/schema/trail-bootstrap-markdown";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import type { TrailSourceIO } from "../ports/trail-source-io";
import { createTrailDomainSourceRepository } from "./trail-domain-source-repository";

describe("Trail Domain Source Repository", () => {
  it("runs transforms against the latest host snapshot and returns an authoritative reread", async () => {
    let persisted = TRAIL_TRIAGE_EMPTY_MARKDOWN;
    const io: TrailSourceIO = {
      create: async (_path, content) => { persisted = content; },
      delete: async () => { persisted = ""; },
      list: async () => [],
      process: async (_path, transform) => {
        persisted = [
          "---",
          "kind: triage",
          "---",
          "",
          "# Issues",
          "",
          "## External",
          '<!-- data {"id":"external","context":"triage","due":1800000000000} -->',
          "",
        ].join("\n");
        persisted = transform(persisted);
      },
      read: async () => persisted,
      rename: async () => undefined,
    };
    const repository = createTrailDomainSourceRepository(io, parseTrailTestYaml);

    const result = await repository.process(
      "triage",
      "Trail/Collections/Triage.md",
      (latest) => `${latest.trimEnd()}\n\n## Managed\n<!-- data {"id":"managed","context":"triage","due":1800000000001} -->\n`,
    );

    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted" || result.snapshot.kind !== "triage") {
      throw new Error("expected accepted Triage source");
    }
    expect(result.snapshot.issues.map((issue) => issue.id)).toEqual(["external", "managed"]);
  });

  it("rereads and validates after create instead of trusting requested bytes", async () => {
    let persisted = "";
    const io: TrailSourceIO = {
      create: async (_path, content) => { persisted = content.replace("kind: triage", "kind: cycles"); },
      delete: async () => undefined,
      list: async () => [],
      process: async () => undefined,
      read: async () => persisted,
      rename: async () => undefined,
    };
    const repository = createTrailDomainSourceRepository(io, parseTrailTestYaml);

    const result = await repository.create(
      "triage",
      "Trail/Collections/Triage.md",
      TRAIL_TRIAGE_EMPTY_MARKDOWN,
    );

    expect(result.kind).toBe("rejected");
  });
});

it("applies logical entity mutations without exposing Markdown to Mutation", async () => {
  let persisted = TRAIL_TRIAGE_EMPTY_MARKDOWN;
  const io: TrailSourceIO = {
    create: async (_path, content) => { persisted = content; },
    delete: async () => { persisted = ""; },
    list: async () => [],
    process: async (_path, transform) => { persisted = transform(persisted); },
    read: async () => persisted,
    rename: async () => undefined,
  };
  const repository = createTrailDomainSourceRepository(io, parseTrailTestYaml);
  const issue = {
    context: "triage" as const,
    due: 1800000000000,
    id: "triage-a",
    labelIds: [],
    title: "Triage A",
  };

  const created = await repository.mutate(
    "triage",
    "Trail/Collections/Triage.md",
    { after: { kind: "issue", value: issue }, kind: "create" },
  );
  expect(created.kind).toBe("accepted");

  const updatedIssue = { ...issue, title: "Updated" };
  const updated = await repository.mutate(
    "triage",
    "Trail/Collections/Triage.md",
    {
      after: { kind: "issue", value: updatedIssue },
      before: { kind: "issue", value: issue },
      kind: "replace",
    },
  );
  expect(updated.kind).toBe("accepted");
  if (updated.kind !== "accepted" || updated.snapshot.kind !== "triage") {
    throw new Error("expected accepted Triage source");
  }
  expect(updated.snapshot.issues[0]?.title).toBe("Updated");
});

it("deletes bootstrap Markdown only when the exact authoritative bytes are unchanged", async () => {
  let persisted: string | undefined = TRAIL_TRIAGE_EMPTY_MARKDOWN;
  const io: TrailSourceIO = {
    create: async (_path, content) => { persisted = content; },
    delete: async () => { persisted = undefined; },
    list: async () => [],
    process: async () => undefined,
    read: async () => {
      if (persisted === undefined) throw new Error("missing");
      return persisted;
    },
    rename: async () => undefined,
  };
  const repository = createTrailDomainSourceRepository(io, parseTrailTestYaml);

  expect(await repository.deleteSourceIfUnchanged(
    "Trail/Collections/Triage.md",
    TRAIL_TRIAGE_EMPTY_MARKDOWN,
  )).toBe(true);
  expect(persisted).toBeUndefined();

  persisted = `${TRAIL_TRIAGE_EMPTY_MARKDOWN}\nuser edit`;
  expect(await repository.deleteSourceIfUnchanged(
    "Trail/Collections/Triage.md",
    TRAIL_TRIAGE_EMPTY_MARKDOWN,
  )).toBe(false);
  expect(persisted).toContain("user edit");
});
