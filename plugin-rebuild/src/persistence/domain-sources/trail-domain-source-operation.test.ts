import { describe, expect, it } from "vitest";

import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import { applyTrailDomainSourceMutation } from "./trail-domain-source-operation";

describe("Trail Domain Source logical mutation", () => {
  it("updates one CRLF Triage record while preserving neighboring record bytes", () => {
    const markdown = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## First",
      '<!-- data {"id":"first","context":"triage","due":1800000000000} -->',
      "",
      "body-first",
      "",
      "## Second",
      '<!-- data {"id":"second","context":"triage","due":1800000000001} -->',
      "",
      "### Keep",
      "second body stays byte-identical",
      "",
    ].join("\r\n");
    const before = {
      context: "triage" as const,
      description: "body-first",
      due: 1_800_000_000_000,
      id: "first",
      labelIds: [],
      title: "First",
    };
    const next = applyTrailDomainSourceMutation({
      kind: "triage",
      markdown,
      mutation: {
        after: { kind: "issue", value: { ...before, title: "First updated" } },
        before: { kind: "issue", value: before },
        kind: "replace",
      },
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Triage.md",
    });

    expect(next).toContain("## First updated\r\n");
    expect(next).toContain([
      "## Second",
      '<!-- data {"id":"second","context":"triage","due":1800000000001} -->',
      "",
      "### Keep",
      "second body stays byte-identical",
      "",
    ].join("\r\n"));
    expect(next).not.toContain("\n## Second\n");
  });
});
