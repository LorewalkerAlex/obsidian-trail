import { describe, expect, it } from "vitest";
import {
  collectMarkdownH2Records,
  parseMarkdownBody,
  replaceMarkdownHeadingAndMarker,
  replaceMarkdownRecordRange,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
} from "./trail-markdown-core";

describe("Trail Markdown Core", () => {
  it("splits BOM + CRLF frontmatter without normalizing source bytes", () => {
    const markdown = "\uFEFF---\r\nkind: triage\r\n---\r\n# Issues\r\n";
    const frontmatter = splitMarkdownFrontmatter(markdown);
    expect(frontmatter?.yaml).toBe("kind: triage\r\n");
    expect(markdown.slice(frontmatter?.bodyStartOffset)).toBe("# Issues\r\n");
  });

  it("treats H3 content as body and H2 as the record boundary", () => {
    const body = [
      "# Issues",
      "",
      "## First",
      '<!-- data {"id":"a"} -->',
      "",
      "### Notes",
      "body",
      "",
      "## Second",
      '<!-- data {"id":"b"} -->',
      "",
    ].join("\n");
    const children = parseMarkdownBody(body).children;
    const region = collectMarkdownH2Records(body, children, 1);
    expect(region.records.map((record) => record.title)).toEqual(["First", "Second"]);
    expect(region.records[0].markerCount).toBe(1);
  });

  it("changes only the heading and immediate marker ranges", () => {
    const markdown = [
      "# Issues",
      "",
      "## Old",
      '<!-- data {"id":"a"} -->',
      "",
      "### Keep",
      "Body stays byte-identical.",
      "",
    ].join("\n");
    const children = parseMarkdownBody(markdown).children;
    const record = collectMarkdownH2Records(markdown, children, 1).records[0];
    const marker = record.immediateMarker;
    if (marker === undefined) throw new Error("fixture marker missing");
    const next = replaceMarkdownHeadingAndMarker(markdown, {
      heading: "## New",
      marker: '<!-- data {"id":"a","due":1} -->',
      markerEndOffset: requiredMarkdownOffset(marker, "end"),
      markerStartOffset: requiredMarkdownOffset(marker, "start"),
      recordStartOffset: record.startOffset,
    });
    expect(next).toContain("## New\n<!-- data {\"id\":\"a\",\"due\":1} -->");
    expect(next).toContain("### Keep\nBody stays byte-identical.");
  });

  it("replaces one complete CRLF record without normalizing neighboring bytes", () => {
    const markdown = "# Issues\r\n\r\n## A\r\n<!-- data {\"id\":\"a\"} -->\r\n\r\nbody-a\r\n\r\n## B\r\n<!-- data {\"id\":\"b\"} -->\r\n\r\nbody-b\r\n";
    const children = parseMarkdownBody(markdown).children;
    const record = collectMarkdownH2Records(markdown, children, 1).records[0];
    const next = replaceMarkdownRecordRange(
      markdown,
      record,
      "## A2\n<!-- data {\"id\":\"a\"} -->\n\nbody-a2",
    );
    expect(next).toContain(
      "## A2\r\n<!-- data {\"id\":\"a\"} -->\r\n\r\nbody-a2\r\n\r\n## B",
    );
    expect(next).toContain(
      "## B\r\n<!-- data {\"id\":\"b\"} -->\r\n\r\nbody-b\r\n",
    );
  });
});
