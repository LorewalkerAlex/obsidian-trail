import {
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "../schema/trail-physical-schema";
import type { TrailYamlParser } from "./trail-codec-support";
import {
  parseCyclesMarkdown,
  parseProjectlessIssuesMarkdown,
} from "./trail-frozen-source-codecs";
import { parseTriageMarkdown } from "./trail-triage-codec";

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
    return parseProjectlessIssuesMarkdown({
      filePath: path,
      markdown,
      parseYaml,
    }).issues.map((issue) => issue.message);
  }

  if (path === TRAIL_CYCLES_PATH) {
    return parseCyclesMarkdown({
      filePath: path,
      markdown,
      parseYaml,
    }).issues.map((issue) => issue.message);
  }

  return [`unsupported Formal singleton path: ${path}`];
}

export function createFormalMarkdownValidator(
  parseYaml: TrailYamlParser,
): (path: string, markdown: string) => readonly string[] {
  return (path, markdown) =>
    validateFormalManagedMarkdown(path, markdown, parseYaml);
}
