import { fromMarkdown } from "mdast-util-from-markdown";

import {
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "./trail-physical-schema";
import {
  parseTriageMarkdown,
  type TrailYamlParser,
} from "./trail-triage-markdown";

interface FrontmatterSlice {
  readonly body: string;
  readonly yaml: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLine(
  text: string,
  startOffset: number,
): { readonly nextOffset: number; readonly text: string } {
  let endOffset = startOffset;
  while (
    endOffset < text.length
    && text[endOffset] !== "\n"
    && text[endOffset] !== "\r"
  ) {
    endOffset += 1;
  }

  let nextOffset = endOffset;
  if (text[nextOffset] === "\r") {
    nextOffset += 1;
  }
  if (text[nextOffset] === "\n") {
    nextOffset += 1;
  }

  return {
    nextOffset,
    text: text.slice(startOffset, endOffset),
  };
}

function splitFrontmatter(markdown: string): FrontmatterSlice | null {
  const firstOffset = markdown.startsWith("\uFEFF") ? 1 : 0;
  const firstLine = readLine(markdown, firstOffset);
  if (firstLine.text.trim() !== "---") {
    return null;
  }

  const yamlStart = firstLine.nextOffset;
  let lineStart = yamlStart;
  while (lineStart <= markdown.length) {
    const line = readLine(markdown, lineStart);
    if (line.text.trim() === "---") {
      return {
        body: markdown.slice(line.nextOffset),
        yaml: markdown.slice(yamlStart, lineStart),
      };
    }
    if (line.nextOffset <= lineStart) {
      break;
    }
    lineStart = line.nextOffset;
  }

  return null;
}

function headingText(node: ReturnType<typeof fromMarkdown>["children"][number]): string {
  if (node.type !== "heading") {
    return "";
  }
  return node.children
    .map((child) => ("value" in child && typeof child.value === "string" ? child.value : ""))
    .join("");
}

function validateCurrentlyEmptyContainer(
  markdown: string,
  parseYaml: TrailYamlParser,
  expectedKind: string,
  expectedHeading: string,
): string[] {
  const issues: string[] = [];
  const frontmatter = splitFrontmatter(markdown);
  if (frontmatter === null) {
    return ["managed container requires frontmatter"];
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = parseYaml(frontmatter.yaml);
  } catch {
    return ["managed container frontmatter is invalid YAML"];
  }

  if (
    !isRecord(parsedYaml)
    || Object.keys(parsedYaml).length !== 1
    || parsedYaml.kind !== expectedKind
  ) {
    issues.push(`managed container frontmatter must contain only kind: ${expectedKind}`);
  }

  const tree = fromMarkdown(frontmatter.body);
  if (tree.children.length !== 1) {
    issues.push("managed container contains unsupported content for the current Formal slice");
    return issues;
  }

  const heading = tree.children[0];
  if (
    heading.type !== "heading"
    || heading.depth !== 1
    || headingText(heading) !== expectedHeading
  ) {
    issues.push(`managed container must contain exactly # ${expectedHeading}`);
  }

  return issues;
}

/**
 * Validates the singleton Markdown surface supported by the current executable
 * Formal schema. Projectless Issues and Cycles remain intentionally empty until
 * their own vertical slices introduce record grammars.
 */
export function validateFormalManagedMarkdown(
  path: string,
  markdown: string,
  parseYaml: TrailYamlParser,
): readonly string[] {
  if (path === TRAIL_TRIAGE_PATH) {
    return parseTriageMarkdown({
      filePath: path,
      markdown,
      parseYaml,
    }).issues.map((issue) => issue.message);
  }

  if (path === TRAIL_PROJECTLESS_ISSUES_PATH) {
    return validateCurrentlyEmptyContainer(
      markdown,
      parseYaml,
      "projectless-issues",
      "Issues",
    );
  }

  if (path === TRAIL_CYCLES_PATH) {
    return validateCurrentlyEmptyContainer(
      markdown,
      parseYaml,
      "cycles",
      "Cycles",
    );
  }

  return [`unsupported Formal singleton path: ${path}`];
}

export function createFormalMarkdownValidator(
  parseYaml: TrailYamlParser,
): (path: string, markdown: string) => readonly string[] {
  return (path, markdown) =>
    validateFormalManagedMarkdown(path, markdown, parseYaml);
}
