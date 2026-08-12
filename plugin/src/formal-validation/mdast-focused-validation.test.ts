import { fromMarkdown } from "mdast-util-from-markdown";
import { describe, expect, it } from "vitest";

type RootChild = ReturnType<typeof fromMarkdown>["children"][number];
type HeadingNode = Extract<RootChild, { type: "heading" }>;
type HtmlNode = Extract<RootChild, { type: "html" }>;

interface ParsedRecord {
  endOffset: number;
  marker: HtmlNode | null;
  startOffset: number;
  title: string;
}

interface StructuralAnalysis {
  errors: string[];
  records: ParsedRecord[];
  tree: ReturnType<typeof fromMarkdown>;
}

const DATA_MARKER = /^<!-- data \{.*\} -->$/;

function headingText(node: HeadingNode): string {
  return node.children
    .map((child) => ("value" in child && typeof child.value === "string" ? child.value : ""))
    .join("");
}

function isHeading(node: RootChild, depth: number): node is HeadingNode {
  return node.type === "heading" && node.depth === depth;
}

function isDataMarker(node: RootChild | undefined): node is HtmlNode {
  return node?.type === "html" && DATA_MARKER.test(node.value.trim());
}

function requiredOffset(
  node: RootChild,
  edge: "end" | "start",
): number {
  const offset = node.position?.[edge].offset;
  if (offset === undefined) {
    throw new Error(`mdast node is missing ${edge} offset`);
  }
  return offset;
}

function analyzeTriageBody(body: string): StructuralAnalysis {
  const tree = fromMarkdown(body);
  const children = tree.children;
  const errors: string[] = [];
  const records: ParsedRecord[] = [];

  const issuesHeadings = children
    .map((node, index) => ({ index, node }))
    .filter(({ node }) => isHeading(node, 1) && headingText(node) === "Issues");

  if (issuesHeadings.length !== 1) {
    errors.push("expected exactly one root # Issues heading");
    return { errors, records, tree };
  }

  const issuesIndex = issuesHeadings[0].index;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (isHeading(node, 1) && index !== issuesIndex) {
      errors.push("unexpected root H1 inside Triage container");
    }
  }

  let index = issuesIndex + 1;
  while (index < children.length) {
    const node = children[index];
    if (!isHeading(node, 2)) {
      index += 1;
      continue;
    }

    let nextBoundary = index + 1;
    while (nextBoundary < children.length) {
      const candidate = children[nextBoundary];
      if (
        candidate.type === "heading" &&
        (candidate.depth === 1 || candidate.depth === 2)
      ) {
        break;
      }
      nextBoundary += 1;
    }

    const recordChildren = children.slice(index + 1, nextBoundary);
    const markerNodes = recordChildren.filter(isDataMarker);
    const immediateMarker = isDataMarker(recordChildren[0])
      ? recordChildren[0]
      : null;

    if (immediateMarker === null) {
      errors.push(`metadata marker must immediately follow H2: ${headingText(node)}`);
    }
    if (markerNodes.length !== 1) {
      errors.push(`expected exactly one metadata marker for H2: ${headingText(node)}`);
    }

    records.push({
      endOffset:
        nextBoundary < children.length
          ? requiredOffset(children[nextBoundary], "start")
          : body.length,
      marker: immediateMarker,
      startOffset: requiredOffset(node, "start"),
      title: headingText(node),
    });

    index = nextBoundary;
  }

  return { errors, records, tree };
}

function canonicalIssue(title: string, id: string): string {
  return [
    `## ${title}`,
    `<!-- data {"id":"${id}","context":"triage","due":1786464000000} -->`,
  ].join("\n");
}

describe("mdast-util-from-markdown focused validation", () => {
  it("parses an empty canonical Triage body without inventing records", () => {
    const result = analyzeTriageBody("# Issues\n");

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([]);
  });

  it("exposes canonical H2 and HTML metadata nodes with exact offsets", () => {
    const body = `# Issues\n\n${canonicalIssue("Review new idea", "issue-a")}\n\nDescription.\n`;
    const result = analyzeTriageBody(body);
    const record = result.records[0];

    expect(result.errors).toEqual([]);
    expect(record.title).toBe("Review new idea");
    expect(body.slice(record.startOffset, requiredOffset(record.marker!, "end"))).toBe(
      canonicalIssue("Review new idea", "issue-a"),
    );
  });

  it("provides non-overlapping record boundaries for multiple H2 records", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("First", "issue-a"),
      "",
      "First body.",
      "",
      canonicalIssue("Second", "issue-b"),
      "",
      "Second body.",
      "",
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.title)).toEqual(["First", "Second"]);
    expect(body.slice(result.records[0].startOffset, result.records[0].endOffset)).toContain(
      "First body.",
    );
    expect(body.slice(result.records[0].startOffset, result.records[0].endOffset)).not.toContain(
      "## Second",
    );
    expect(result.records[0].endOffset).toBe(result.records[1].startOffset);
  });

  it("keeps H3-H6 content inside the current record", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("One", "issue-a"),
      "",
      "### Notes",
      "Body under H3.",
      "#### Detail",
      "More body.",
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(1);
  });

  it("does not treat fenced-code heading or metadata decoys as structure", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("Real", "issue-a"),
      "",
      "```md",
      "## Fake",
      '<!-- data {"id":"fake","context":"triage","due":1} -->',
      "```",
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.title)).toEqual(["Real"]);
    expect(result.tree.children.some((node) => node.type === "code")).toBe(true);
  });

  it("does not promote nested blockquote or callout headings to root record boundaries", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("Real", "issue-a"),
      "",
      "> [!note]",
      "> ## Nested fake",
      '> <!-- data {"id":"fake","context":"triage","due":1} -->',
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.title)).toEqual(["Real"]);
    expect(result.tree.children.some((node) => node.type === "blockquote")).toBe(true);
  });

  it("can reject a metadata marker that is not immediately after its H2", () => {
    const body = [
      "# Issues",
      "",
      "## Misplaced",
      "A paragraph appears first.",
      '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toContain("metadata marker must immediately follow H2: Misplaced");
  });

  it("can distinguish missing and duplicate metadata markers", () => {
    const missing = analyzeTriageBody(["# Issues", "", "## Missing", "Body."].join("\n"));
    const duplicate = analyzeTriageBody(
      [
        "# Issues",
        "",
        canonicalIssue("Duplicate", "issue-a"),
        "Body between duplicate markers.",
        '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
      ].join("\n"),
    );

    expect(missing.errors).toContain("metadata marker must immediately follow H2: Missing");
    expect(missing.errors).toContain("expected exactly one metadata marker for H2: Missing");
    expect(duplicate.errors).toContain("expected exactly one metadata marker for H2: Duplicate");
  });

  it("keeps common Obsidian body syntax from creating false root records", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("Obsidian body", "issue-a"),
      "",
      "[[Project Note]] and ![[diagram.png]]",
      "",
      "> [!tip]",
      "> Callout body",
      "> ### Nested detail",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toEqual([]);
    expect(result.records.map((record) => record.title)).toEqual(["Obsidian body"]);
  });

  it("rebases CRLF body offsets correctly after BOM and frontmatter", () => {
    const raw = [
      "\uFEFF---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## CRLF record",
      '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
      "",
      "Body.",
      "",
    ].join("\r\n");
    const bodyStart = raw.indexOf("# Issues");
    const body = raw.slice(bodyStart);
    const result = analyzeTriageBody(body);
    const record = result.records[0];

    expect(result.errors).toEqual([]);
    expect(raw.slice(bodyStart + record.startOffset, bodyStart + record.endOffset)).toContain(
      "## CRLF record\r\n",
    );
  });

  it("surfaces an unexpected root H1 instead of guessing a record boundary", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("One", "issue-a"),
      "",
      "# Unexpected",
      "Body.",
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toContain("unexpected root H1 inside Triage container");
  });

  it("does not confuse ordinary HTML with the exact Trail data marker", () => {
    const body = [
      "# Issues",
      "",
      canonicalIssue("HTML body", "issue-a"),
      "",
      "<!-- ordinary comment -->",
      "<div>ordinary html</div>",
    ].join("\n");
    const result = analyzeTriageBody(body);

    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(1);
  });
});
