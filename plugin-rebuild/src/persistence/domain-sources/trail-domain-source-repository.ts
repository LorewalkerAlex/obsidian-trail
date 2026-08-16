import {
  parseCyclesMarkdown,
} from "../../markdown/codecs/trail-cycles-codec";
import {
  parseInitiativeMarkdown,
} from "../../markdown/codecs/trail-initiative-codec";
import {
  parseProjectMarkdown,
} from "../../markdown/codecs/trail-project-codec";
import {
  parseProjectlessIssuesMarkdown,
} from "../../markdown/codecs/trail-projectless-issues-codec";
import {
  parseTriageMarkdown,
} from "../../markdown/codecs/trail-triage-codec";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import type { TrailDomainSourceKind } from "../../markdown/schema/trail-physical-schema";
import type { TrailSourceEntry, TrailSourceIO } from "../ports/trail-source-io";
import {
  cyclesSourceResult,
  initiativeSourceResult,
  projectSourceResult,
  projectlessIssuesSourceResult,
  triageSourceResult,
  type TrailDomainSourceReadResult,
} from "./trail-source-result";

export type TrailManagedDomainSourceKind = TrailDomainSourceKind;

export interface TrailDomainSourceRepository {
  readonly create: (
    kind: TrailManagedDomainSourceKind,
    path: string,
    markdown: string,
  ) => Promise<TrailDomainSourceReadResult>;
  readonly list: (path: string) => Promise<readonly TrailSourceEntry[]>;
  readonly process: (
    kind: TrailManagedDomainSourceKind,
    path: string,
    transform: (latest: string) => string,
  ) => Promise<TrailDomainSourceReadResult>;
  readonly read: (
    kind: TrailManagedDomainSourceKind,
    path: string,
  ) => Promise<TrailDomainSourceReadResult>;
}

function parseManagedSource(
  kind: TrailManagedDomainSourceKind,
  path: string,
  markdown: string,
  parseYaml: TrailYamlParser,
): TrailDomainSourceReadResult {
  switch (kind) {
    case "initiative":
      return initiativeSourceResult(parseInitiativeMarkdown({
        markdown,
        parseYaml,
        sourcePath: path,
      }), path);
    case "project":
      return projectSourceResult(parseProjectMarkdown({
        markdown,
        parseYaml,
        sourcePath: path,
      }), path);
    case "triage":
      return triageSourceResult(parseTriageMarkdown({
        markdown,
        parseYaml,
        sourcePath: path,
      }), path);
    case "projectless-issues":
      return projectlessIssuesSourceResult(parseProjectlessIssuesMarkdown({
        markdown,
        parseYaml,
        sourcePath: path,
      }), path);
    case "cycles":
      return cyclesSourceResult(parseCyclesMarkdown({
        markdown,
        parseYaml,
        sourcePath: path,
      }), path);
  }
}

/**
 * Canonical Domain Markdown persistence lifecycle. Codec/range details terminate
 * here: callers receive authoritative logical source results after every reread.
 */
export function createTrailDomainSourceRepository(
  sourceIO: TrailSourceIO,
  parseYaml: TrailYamlParser,
): TrailDomainSourceRepository {
  const read = async (
    kind: TrailManagedDomainSourceKind,
    path: string,
  ): Promise<TrailDomainSourceReadResult> =>
    parseManagedSource(kind, path, await sourceIO.read(path), parseYaml);

  return {
    async create(kind, path, markdown): Promise<TrailDomainSourceReadResult> {
      await sourceIO.create(path, markdown);
      return read(kind, path);
    },
    list: (path: string) => sourceIO.list(path),
    async process(kind, path, transform): Promise<TrailDomainSourceReadResult> {
      await sourceIO.process(path, transform);
      return read(kind, path);
    },
    read,
  };
}
