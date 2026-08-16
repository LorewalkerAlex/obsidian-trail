import { fromMarkdown } from "mdast-util-from-markdown";

export type TrailMarkdownRoot = ReturnType<typeof fromMarkdown>;
export type TrailMarkdownRootChild = TrailMarkdownRoot["children"][number];
export type TrailMarkdownHeadingNode = Extract<TrailMarkdownRootChild, { type: "heading" }>;
export type TrailMarkdownHtmlNode = Extract<TrailMarkdownRootChild, { type: "html" }>;

export interface TrailMarkdownLine {
  readonly endOffset: number;
  readonly nextOffset: number;
  readonly text: string;
}

export interface TrailMarkdownFrontmatter {
  readonly bodyStartOffset: number;
  readonly yaml: string;
}

export interface TrailMarkdownRecordSlice {
  readonly endOffset: number;
  readonly heading: TrailMarkdownHeadingNode;
  readonly immediateMarker?: TrailMarkdownHtmlNode;
  readonly markerCount: number;
  readonly markerJson: string | null;
  readonly startOffset: number;
  readonly title: string;
}

export interface TrailMarkdownRecordRegion {
  readonly orphanNodes: readonly TrailMarkdownRootChild[];
  readonly records: readonly TrailMarkdownRecordSlice[];
}

export interface TrailRecordSourceRange {
  readonly endOffset: number;
  readonly filePath: string;
  readonly markerEndOffset: number;
  readonly markerStartOffset: number;
  readonly startOffset: number;
}

const DATA_MARKER = /^<!-- data (\{.*\}) -->$/;

export function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readMarkdownLine(text: string, startOffset: number): TrailMarkdownLine {
  let endOffset = startOffset;
  while (endOffset < text.length && text[endOffset] !== "\n" && text[endOffset] !== "\r") {
    endOffset += 1;
  }

  let nextOffset = endOffset;
  if (text[nextOffset] === "\r") nextOffset += 1;
  if (text[nextOffset] === "\n") nextOffset += 1;

  return { endOffset, nextOffset, text: text.slice(startOffset, endOffset) };
}

/** Splits frontmatter without normalizing bytes, including UTF-8 BOM and CRLF input. */
export function splitMarkdownFrontmatter(markdown: string): TrailMarkdownFrontmatter | null {
  const firstOffset = markdown.startsWith("\uFEFF") ? 1 : 0;
  const firstLine = readMarkdownLine(markdown, firstOffset);
  if (firstLine.text.trim() !== "---") return null;

  const yamlStart = firstLine.nextOffset;
  let lineStart = yamlStart;
  while (lineStart <= markdown.length) {
    const line = readMarkdownLine(markdown, lineStart);
    if (line.text.trim() === "---") {
      return {
        bodyStartOffset: line.nextOffset,
        yaml: markdown.slice(yamlStart, lineStart),
      };
    }
    if (line.nextOffset <= lineStart) break;
    lineStart = line.nextOffset;
  }
  return null;
}

export function requiredMarkdownOffset(
  node: TrailMarkdownRootChild,
  edge: "end" | "start",
): number {
  const offset = node.position?.[edge].offset;
  if (offset === undefined) throw new Error(`mdast node is missing ${edge} offset`);
  return offset;
}

export function markdownHeadingText(node: TrailMarkdownHeadingNode): string {
  const read = (child: unknown): string => {
    if (!isRecordObject(child)) return "";
    if (typeof child.value === "string") return child.value;
    if (Array.isArray(child.children)) return child.children.map(read).join("");
    return "";
  };
  return node.children.map(read).join("");
}

export function isMarkdownHeading(
  node: TrailMarkdownRootChild,
  depth: number,
): node is TrailMarkdownHeadingNode {
  return node.type === "heading" && node.depth === depth;
}

export function markdownDataMarkerJson(node: TrailMarkdownRootChild | undefined): string | null {
  if (node?.type !== "html") return null;
  return DATA_MARKER.exec(node.value.trim())?.[1] ?? null;
}

export function isMarkdownDataMarker(node: TrailMarkdownRootChild): node is TrailMarkdownHtmlNode {
  return markdownDataMarkerJson(node) !== null;
}

export function parseMarkdownBody(body: string): TrailMarkdownRoot {
  return fromMarkdown(body);
}

export function normalizeMarkdownRecordBody(markdown: string): string | undefined {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  const result = lines.join("\n");
  return result.length > 0 ? result : undefined;
}

/** H1/H2 own structure; H3-H6 and ordinary Markdown remain inside the current H2 record. */
export function collectMarkdownH2Records(
  body: string,
  children: readonly TrailMarkdownRootChild[],
  startIndex: number,
  endIndex = children.length,
): TrailMarkdownRecordRegion {
  const records: TrailMarkdownRecordSlice[] = [];
  const orphanNodes: TrailMarkdownRootChild[] = [];
  let index = startIndex;

  while (index < endIndex) {
    const node = children[index];
    if (!isMarkdownHeading(node, 2)) {
      orphanNodes.push(node);
      index += 1;
      continue;
    }

    let nextBoundary = index + 1;
    while (nextBoundary < endIndex) {
      const candidate = children[nextBoundary];
      if (candidate.type === "heading" && (candidate.depth === 1 || candidate.depth === 2)) break;
      nextBoundary += 1;
    }

    const recordChildren = children.slice(index + 1, nextBoundary);
    const markerNodes = recordChildren.filter(isMarkdownDataMarker);
    const immediateNode = recordChildren[0];
    const markerJson = markdownDataMarkerJson(immediateNode);
    const immediateMarker = markerJson !== null && immediateNode?.type === "html"
      ? immediateNode
      : undefined;

    records.push({
      endOffset: nextBoundary < children.length
        ? requiredMarkdownOffset(children[nextBoundary], "start")
        : body.length,
      heading: node,
      immediateMarker,
      markerCount: markerNodes.length,
      markerJson,
      startOffset: requiredMarkdownOffset(node, "start"),
      title: markdownHeadingText(node),
    });
    index = nextBoundary;
  }

  return { orphanNodes, records };
}

export function appendMarkdownBlock(markdown: string, block: string): string {
  const base = markdown.replace(/[\r\n]+$/, "");
  return `${base}\n\n${block}\n`;
}

export function removeMarkdownRange(markdown: string, startOffset: number, endOffset: number): string {
  return markdown.slice(0, startOffset) + markdown.slice(endOffset);
}

/** Replaces only one record heading line and its immediate metadata marker. */
export function replaceMarkdownHeadingAndMarker(
  markdown: string,
  input: {
    readonly heading: string;
    readonly marker: string;
    readonly markerEndOffset: number;
    readonly markerStartOffset: number;
    readonly recordStartOffset: number;
  },
): string {
  const headingLine = readMarkdownLine(markdown, input.recordStartOffset);
  let next = markdown.slice(0, input.markerStartOffset)
    + input.marker
    + markdown.slice(input.markerEndOffset);
  next = next.slice(0, input.recordStartOffset)
    + input.heading
    + next.slice(headingLine.endOffset);
  return next;
}
