import { describe, expect, it } from "vitest";
import type { TrailInitiative } from "../../domain/model/trail-entities";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import {
  parseInitiativeMarkdown,
  serializeInitiativeMarkdown,
} from "./trail-initiative-codec";

describe("Initiative Markdown codec", () => {
  it("round-trips the canonical Initiative carrier", () => {
    const initiative: TrailInitiative = {
      description: "Long-term outcome.\n\n### Related Notes\n- [[Research]]",
      due: 1_800_000_000_000,
      id: "initiative-a",
      labelIds: ["label-z", "label-a"],
      priority: "high",
      title: "Household Finance",
    };
    const markdown = serializeInitiativeMarkdown(initiative);
    const parsed = parseInitiativeMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Initiatives/0001 Household Finance.md",
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.document?.initiative).toEqual({
      ...initiative,
      labelIds: ["label-a", "label-z"],
    });
    expect(markdown).toContain('<!-- data {"priority":"high","due":1800000000000,"labelIds":["label-a","label-z"]} -->');
  });

  it("fails closed on unknown managed metadata", () => {
    const markdown = [
      "---",
      "kind: initiative",
      'id: "initiative-a"',
      "---",
      "",
      "# Initiative",
      "",
      "## Goal",
      '<!-- data {"unknown":true} -->',
      "",
    ].join("\n");
    const parsed = parseInitiativeMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Initiatives/0001 Goal.md",
    });

    expect(parsed.document).toBeUndefined();
    expect(parsed.issues.some((issue) => issue.message.includes("unknown Initiative metadata field"))).toBe(true);
  });
});
