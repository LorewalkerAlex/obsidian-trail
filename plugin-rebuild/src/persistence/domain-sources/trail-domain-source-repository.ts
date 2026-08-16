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
  applyTrailDomainSourceMutation,
  serializeTrailNewDomainSource,
  type TrailDomainSourceEntityMutation,
  type TrailDomainSourceMutationOptions,
  type TrailNewDomainSource,
} from "./trail-domain-source-operation";
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
  /** Low-level managed-source create retained for bootstrap/migration composition. */
  readonly create: (
    kind: TrailManagedDomainSourceKind,
    path: string,
    markdown: string,
  ) => Promise<TrailDomainSourceReadResult>;
  /** Creates a file-backed Domain source without exposing Markdown above Persistence. */
  readonly createSource: (source: TrailNewDomainSource) => Promise<TrailDomainSourceReadResult>;
  readonly deleteSource: (path: string) => Promise<void>;
  readonly list: (path: string) => Promise<readonly TrailSourceEntry[]>;
  /** Applies an entity-level mutation against the latest authoritative bytes, then rereads. */
  readonly mutate: (
    kind: TrailManagedDomainSourceKind,
    path: string,
    mutation: TrailDomainSourceEntityMutation,
    options?: TrailDomainSourceMutationOptions,
  ) => Promise<TrailDomainSourceReadResult>;
  /** Low-level guarded transform retained below Persistence for bootstrap/migration internals. */
  readonly process: (
    kind: TrailManagedDomainSourceKind,
    path: string,
    transform: (latest: string) => string,
  ) => Promise<TrailDomainSourceReadResult>;
  readonly read: (
    kind: TrailManagedDomainSourceKind,
    path: string,
  ) => Promise<TrailDomainSourceReadResult>;
  readonly renameSource: (
    kind: TrailManagedDomainSourceKind,
    from: string,
    to: string,
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
    async createSource(source): Promise<TrailDomainSourceReadResult> {
      await sourceIO.create(source.path, serializeTrailNewDomainSource(source));
      return read(source.kind, source.path);
    },
    deleteSource: (path: string) => sourceIO.delete(path),
    list: (path: string) => sourceIO.list(path),
    async mutate(kind, path, mutation, options): Promise<TrailDomainSourceReadResult> {
      await sourceIO.process(path, (latest) => applyTrailDomainSourceMutation({
        kind,
        markdown: latest,
        mutation,
        options,
        parseYaml,
        sourcePath: path,
      }));
      return read(kind, path);
    },
    async process(kind, path, transform): Promise<TrailDomainSourceReadResult> {
      await sourceIO.process(path, transform);
      return read(kind, path);
    },
    read,
    async renameSource(kind, from, to): Promise<TrailDomainSourceReadResult> {
      await sourceIO.rename(from, to);
      return read(kind, to);
    },
  };
}
