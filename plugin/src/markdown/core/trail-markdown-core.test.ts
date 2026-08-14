import { describe, expect, it } from "vitest";

import {
  collectMarkdownH2Records,
  parseMarkdownBody,
  replaceMarkdownHeadingAndMarker,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
} from "./trail-markdown-core";

describe("Trail Markdown Core", () => {
  it("keeps BOM/CRLF offsets and nested Markdown inside the current H2 record", () => {
    const markdown = [
      "\uFEFF---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## Real",
      '<!-- data {"id":"issue-a"} -->',
      "",
      "### Notes",
      "```md",
      "## Fake",
      "```",
      "",
    ].join("\r\n");
    const frontmatter = splitMarkdownFrontmatter(markdown);
    if (frontmatter === null) throw new Error("fixture frontmatter missing");
    const body = markdown.slice(frontmatter.bodyStartOffset);
    const children = parseMarkdownBody(body).children;
    const region = collectMarkdownH2Records(body, children, 1);

    expect(region.orphanNodes).toEqual([]);
    expect(region.records).toHaveLength(1);
    expect(region.records[0].title).toBe("Real");
    expect(markdown.slice(
      frontmatter.bodyStartOffset + region.records[0].startOffset,
      frontmatter.bodyStartOffset + region.records[0].endOffset,
    )).toContain("## Fake\r\n");
  });

  it("replaces only the heading line and metadata marker ranges", () => {
    const markdown = [
      "# Issues",
      "",
      "## Before",
      '<!-- data {"id":"issue-a","due":1} -->',
      "",
      "Body keeps  two spaces.  ",
      "",
    ].join("\n");
    const children = parseMarkdownBody(markdown).children;
    const record = collectMarkdownH2Records(markdown, children, 1).records[0];
    if (record.immediateMarker === undefined) throw new Error("fixture marker missing");
    const markerStart = requiredMarkdownOffset(record.immediateMarker, "start");
    const markerEnd = requiredMarkdownOffset(record.immediateMarker, "end");

    const next = replaceMarkdownHeadingAndMarker(markdown, {
      heading: "## After",
      marker: '<!-- data {"id":"issue-a","due":2} -->',
      markerEndOffset: markerEnd,
      markerStartOffset: markerStart,
      recordStartOffset: record.startOffset,
    });

    expect(next).toContain("## After");
    expect(next).toContain('"due":2');
    expect(next).toContain("Body keeps  two spaces.  ");
  });
});
