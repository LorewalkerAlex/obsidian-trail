import { describe, expect, it } from "vitest";

import { serializeInitiativeMarkdown } from "./trail-initiative-codec";

const initiative = {
  id: "initiative-a",
  labelIds: [] as string[],
  title: "Initiative A",
};

describe("Initiative properties Markdown write guard", () => {
  it("rejects root H1 and H2 headings in editable Initiative descriptions", () => {
    expect(() => serializeInitiativeMarkdown({
      ...initiative,
      description: "# Injected root",
    })).toThrow("Initiative description must not contain root H1 or H2 headings");

    expect(() => serializeInitiativeMarkdown({
      ...initiative,
      description: "## Injected record",
    })).toThrow("Initiative description must not contain root H1 or H2 headings");
  });

  it("allows H3 detail headings and fenced H2 examples", () => {
    const markdown = serializeInitiativeMarkdown({
      ...initiative,
      description: "### Detail\nKeep strategy here.\n\n~~~md\n## Example only\n~~~",
    });
    expect(markdown).toContain("### Detail");
    expect(markdown).toContain("## Example only");
  });
});
