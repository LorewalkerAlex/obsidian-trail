import { describe, expect, it } from "vitest";

import { TRAIL_TRIAGE_EMPTY_MARKDOWN, TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-physical-schema";
import type { TrailSourceIO } from "../ports/trail-source-io";
import { createTrailDomainSourceRepository } from "./trail-domain-source-repository";
import { createTriageSourcePersistence } from "./trail-triage-source-persistence";

function parseYaml(yaml: string): unknown {
  return { kind: yaml.trim().split(":")[1]?.trim() };
}

function createFixture(initial = TRAIL_TRIAGE_EMPTY_MARKDOWN) {
  let markdown = initial;
  const processInputs: string[] = [];
  const sourceIO: TrailSourceIO = {
    async create(_path, content) {
      markdown = content;
    },
    async delete() {
      markdown = "";
    },
    async list() {
      return [];
    },
    async process(_path, transform) {
      processInputs.push(markdown);
      markdown = transform(markdown);
    },
    async read() {
      return markdown;
    },
    async rename() {},
  };
  return {
    getMarkdown: () => markdown,
    persistence: createTriageSourcePersistence(
      createTrailDomainSourceRepository(sourceIO),
      parseYaml,
    ),
    processInputs,
    setMarkdown: (next: string) => {
      markdown = next;
    },
  };
}

describe("Triage source persistence", () => {
  it("reads and appends through the canonical repository lifecycle", async () => {
    const fixture = createFixture();
    expect((await fixture.persistence.readLatest()).issues).toEqual([]);
    fixture.setMarkdown(
      `${TRAIL_TRIAGE_EMPTY_MARKDOWN}\n## External\n<!-- data {"id":"external","context":"triage","due":10} -->\n`,
    );

    const result = await fixture.persistence.appendIssue({
      context: "triage",
      due: 20,
      id: "captured",
      labelIds: [],
      title: "Captured",
    });

    expect(fixture.processInputs[0]).toContain("## External");
    expect(Object.keys(result.contribution.issuesById).sort()).toEqual([
      "captured",
      "external",
    ]);
    expect(result.contribution.filePath).toBe(TRAIL_TRIAGE_PATH);
  });

  it("refuses an invalid latest source before mutation", async () => {
    const invalid = `${TRAIL_TRIAGE_EMPTY_MARKDOWN}\n## Broken\nNo marker\n`;
    const fixture = createFixture(invalid);

    await expect(fixture.persistence.appendIssue({
      context: "triage",
      due: 20,
      id: "captured",
      labelIds: [],
      title: "Captured",
    })).rejects.toMatchObject({ code: "source-invalid" });
    expect(fixture.getMarkdown()).toBe(invalid);
  });

  it("updates and deletes guarded records while preserving body bytes", async () => {
    const fixture = createFixture();
    const created = await fixture.persistence.appendIssue({
      context: "triage",
      description: "Body stays.",
      due: 20,
      id: "managed",
      labelIds: [],
      title: "Managed",
    });
    const expectedIssue = created.contribution.issuesById.managed;

    const updated = await fixture.persistence.updateIssue(
      expectedIssue,
      { ...expectedIssue, due: 30, title: "Managed edited" },
    );
    expect(updated.contribution.issuesById.managed).toMatchObject({
      due: 30,
      title: "Managed edited",
    });
    expect(fixture.getMarkdown()).toContain("Body stays.");

    const deleted = await fixture.persistence.deleteIssue(
      updated.contribution.issuesById.managed,
    );
    expect(deleted.contribution.issuesById.managed).toBeUndefined();
  });

  it("rejects a stale guarded update instead of overwriting an external edit", async () => {
    const fixture = createFixture();
    const created = await fixture.persistence.appendIssue({
      context: "triage",
      due: 20,
      id: "managed",
      labelIds: [],
      title: "Managed",
    });
    const expectedIssue = created.contribution.issuesById.managed;
    fixture.setMarkdown(fixture.getMarkdown().replace(
      "## Managed",
      "## External edit",
    ));

    await expect(fixture.persistence.updateIssue(
      expectedIssue,
      { ...expectedIssue, due: 30 },
    )).rejects.toMatchObject({ code: "conflict" });
    expect(fixture.getMarkdown()).toContain("## External edit");
  });
});
