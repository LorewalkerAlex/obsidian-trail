import type {
  TrailCycle,
  TrailDomainEntity,
  TrailInitiative,
  TrailProject,
} from "../../domain/model/trail-entities";
import { sameTrailDomainEntity } from "../../domain/rules/trail-domain-equality";
import {
  parseCyclesMarkdown,
  serializeCycleRecord,
} from "../../markdown/codecs/trail-cycles-codec";
import {
  parseInitiativeMarkdown,
  serializeInitiativeMarkdown,
} from "../../markdown/codecs/trail-initiative-codec";
import {
  parseProjectMarkdown,
  serializeProjectMarkdown,
  serializeProjectMilestone,
  serializeProjectRecord,
  serializeProjectWorkflowIssue,
} from "../../markdown/codecs/trail-project-codec";
import {
  parseTriageMarkdown,
  serializeTriageIssue,
} from "../../markdown/codecs/trail-triage-codec";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import {
  appendMarkdownBlock,
  insertMarkdownRecordBefore,
  isMarkdownHeading,
  markdownHeadingText,
  parseMarkdownBody,
  removeMarkdownRange,
  replaceMarkdownRecordRange,
  requiredMarkdownOffset,
  splitMarkdownFrontmatter,
  type TrailRecordSourceRange,
} from "../../markdown/core/trail-markdown-core";
import type { TrailDomainSourceKind } from "../../markdown/schema/trail-physical-schema";

export type TrailDomainSourceEntityMutation =
  | { readonly after: TrailDomainEntity; readonly kind: "create" }
  | {
      readonly after: TrailDomainEntity;
      readonly before: TrailDomainEntity;
      readonly kind: "replace";
    }
  | { readonly before: TrailDomainEntity; readonly kind: "delete" };

export type TrailNewDomainSource =
  | { readonly initiative: TrailInitiative; readonly kind: "initiative"; readonly path: string }
  | { readonly kind: "project"; readonly path: string; readonly project: TrailProject };

export interface TrailDomainSourceMutationOptions {
  readonly cycleTimezone?: string;
}

function mutationEntity(mutation: TrailDomainSourceEntityMutation): TrailDomainEntity {
  return mutation.kind === "create" ? mutation.after : mutation.before;
}

function assertReplaceIdentity(mutation: Extract<TrailDomainSourceEntityMutation, { kind: "replace" }>): void {
  if (
    mutation.before.kind !== mutation.after.kind
    || mutation.before.value.id !== mutation.after.value.id
  ) {
    throw new Error("Domain source Replace must preserve entity kind and identity");
  }
}

function assertExpected(
  actual: TrailDomainEntity | undefined,
  expected: TrailDomainEntity,
  sourcePath: string,
): void {
  if (actual === undefined || !sameTrailDomainEntity(actual, expected)) {
    throw new Error(`Authoritative source precondition failed for ${expected.value.id} in ${sourcePath}`);
  }
}

function requireCleanParse(
  issues: readonly unknown[],
  hasDocument: boolean,
  sourcePath: string,
): void {
  if (!hasDocument || issues.length > 0) {
    throw new Error(`Cannot mutate untrusted managed source: ${sourcePath}`);
  }
}

function replaceRecord(
  markdown: string,
  range: TrailRecordSourceRange,
  record: string,
): string {
  return replaceMarkdownRecordRange(markdown, range, record);
}

function deleteRecord(markdown: string, range: TrailRecordSourceRange): string {
  return removeMarkdownRange(markdown, range.startOffset, range.endOffset);
}

function cycleLabel(cycle: TrailCycle, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(cycle.startedAt).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function serializeCycleForMutation(cycle: TrailCycle, timezone: string | undefined): string {
  if (timezone === undefined || timezone.trim() === "") {
    throw new Error("Cycle mutation requires a physical timezone");
  }
  return serializeCycleRecord(cycle, (value) => cycleLabel(value, timezone));
}

function projectIssuesSectionOffset(markdown: string): number {
  const frontmatter = splitMarkdownFrontmatter(markdown);
  if (frontmatter === null) throw new Error("Project frontmatter is unavailable during mutation");
  const body = markdown.slice(frontmatter.bodyStartOffset);
  for (const node of parseMarkdownBody(body).children) {
    if (isMarkdownHeading(node, 1) && markdownHeadingText(node) === "Issues") {
      return frontmatter.bodyStartOffset + requiredMarkdownOffset(node, "start");
    }
  }
  throw new Error("Project # Issues section is unavailable during mutation");
}

/**
 * Persistence-side logical source transform. Common record mutations are
 * range-local so unrelated Markdown bytes remain untouched.
 */
export function applyTrailDomainSourceMutation(input: {
  readonly kind: TrailDomainSourceKind;
  readonly markdown: string;
  readonly mutation: TrailDomainSourceEntityMutation;
  readonly options?: TrailDomainSourceMutationOptions;
  readonly parseYaml: TrailYamlParser;
  readonly sourcePath: string;
}): string {
  const entity = mutationEntity(input.mutation);

  switch (input.kind) {
    case "initiative": {
      const parsed = parseInitiativeMarkdown(input);
      requireCleanParse(parsed.issues, parsed.document !== undefined, input.sourcePath);
      const document = parsed.document!;
      if (
        input.mutation.kind !== "replace"
        || input.mutation.before.kind !== "initiative"
        || input.mutation.after.kind !== "initiative"
      ) {
        throw new Error("Initiative source mutation supports identity-preserving Replace only");
      }
      assertExpected({ kind: "initiative", value: document.initiative }, input.mutation.before, input.sourcePath);
      assertReplaceIdentity(input.mutation);
      return serializeInitiativeMarkdown(input.mutation.after.value);
    }

    case "project": {
      const parsed = parseProjectMarkdown(input);
      requireCleanParse(parsed.issues, parsed.document !== undefined, input.sourcePath);
      const document = parsed.document!;

      if (entity.kind === "project") {
        if (
          input.mutation.kind !== "replace"
          || input.mutation.before.kind !== "project"
          || input.mutation.after.kind !== "project"
        ) {
          throw new Error("Project root record supports identity-preserving Replace only");
        }
        assertExpected({ kind: "project", value: document.project }, input.mutation.before, input.sourcePath);
        assertReplaceIdentity(input.mutation);
        return replaceRecord(
          input.markdown,
          document.projectLocation,
          serializeProjectRecord(input.mutation.after.value),
        );
      }

      if (entity.kind === "milestone") {
        const existing = document.milestones.find((value) => value.id === entity.value.id);
        const existingLocation = document.locationsByMilestoneId[entity.value.id];
        if (input.mutation.kind === "create") {
          if (existing !== undefined) throw new Error(`Milestone already exists: ${entity.value.id}`);
          if (input.mutation.after.kind !== "milestone" || input.mutation.after.value.projectId !== document.project.id) {
            throw new Error("Milestone must belong to its Project source");
          }
          return insertMarkdownRecordBefore(
            input.markdown,
            projectIssuesSectionOffset(input.markdown),
            serializeProjectMilestone(input.mutation.after.value, document.project.id),
          );
        }
        if (existingLocation === undefined || existing === undefined) {
          throw new Error(`Milestone is absent from authoritative source: ${entity.value.id}`);
        }
        assertExpected({ kind: "milestone", value: existing }, input.mutation.before, input.sourcePath);
        if (input.mutation.kind === "delete") return deleteRecord(input.markdown, existingLocation);
        assertReplaceIdentity(input.mutation);
        if (input.mutation.after.kind !== "milestone" || input.mutation.after.value.projectId !== document.project.id) {
          throw new Error("Milestone must belong to its Project source");
        }
        return replaceRecord(
          input.markdown,
          existingLocation,
          serializeProjectMilestone(input.mutation.after.value, document.project.id),
        );
      }

      if (entity.kind === "issue") {
        const existing = document.issues.find((value) => value.id === entity.value.id);
        const existingLocation = document.locationsByIssueId[entity.value.id];
        const requireProjectIssue = (candidate: TrailDomainEntity) => {
          if (
            candidate.kind !== "issue"
            || candidate.value.context !== "workflow"
            || candidate.value.projectId !== document.project.id
          ) {
            throw new Error("Project source accepts Workflow Issues for its own Project only");
          }
          return candidate.value;
        };
        if (input.mutation.kind === "create") {
          if (existing !== undefined) throw new Error(`Workflow Issue already exists: ${entity.value.id}`);
          return appendMarkdownBlock(
            input.markdown,
            serializeProjectWorkflowIssue(requireProjectIssue(input.mutation.after), document.project.id),
          );
        }
        if (existingLocation === undefined || existing === undefined) {
          throw new Error(`Workflow Issue is absent from authoritative source: ${entity.value.id}`);
        }
        assertExpected({ kind: "issue", value: existing }, input.mutation.before, input.sourcePath);
        if (input.mutation.kind === "delete") return deleteRecord(input.markdown, existingLocation);
        assertReplaceIdentity(input.mutation);
        return replaceRecord(
          input.markdown,
          existingLocation,
          serializeProjectWorkflowIssue(requireProjectIssue(input.mutation.after), document.project.id),
        );
      }

      throw new Error(`Entity kind ${entity.kind} cannot be stored in a Project source`);
    }

    case "triage": {
      const parsed = parseTriageMarkdown(input);
      requireCleanParse(parsed.issues, parsed.document !== undefined, input.sourcePath);
      const document = parsed.document!;
      if (entity.kind !== "issue" || entity.value.context !== "triage") {
        throw new Error("Triage source accepts Triage Issues only");
      }
      const existing = document.issues.find((value) => value.id === entity.value.id);
      const location = document.locationsByIssueId[entity.value.id];
      if (input.mutation.kind === "create") {
        if (existing !== undefined) throw new Error(`Triage Issue already exists: ${entity.value.id}`);
        if (input.mutation.after.kind !== "issue" || input.mutation.after.value.context !== "triage") {
          throw new Error("Triage source accepts Triage Issues only");
        }
        return appendMarkdownBlock(input.markdown, serializeTriageIssue(input.mutation.after.value));
      }
      if (existing === undefined || location === undefined) {
        throw new Error(`Triage Issue is absent from authoritative source: ${entity.value.id}`);
      }
      assertExpected({ kind: "issue", value: existing }, input.mutation.before, input.sourcePath);
      if (input.mutation.kind === "delete") return deleteRecord(input.markdown, location);
      assertReplaceIdentity(input.mutation);
      if (input.mutation.after.kind !== "issue" || input.mutation.after.value.context !== "triage") {
        throw new Error("Triage source accepts Triage Issues only");
      }
      return replaceRecord(input.markdown, location, serializeTriageIssue(input.mutation.after.value));
    }

    case "cycles": {
      const parsed = parseCyclesMarkdown(input);
      requireCleanParse(parsed.issues, parsed.document !== undefined, input.sourcePath);
      const document = parsed.document!;
      if (entity.kind !== "cycle") throw new Error("Cycles source accepts Cycle entities only");
      const existing = document.cycles.find((value) => value.id === entity.value.id);
      const location = document.locationsByCycleId[entity.value.id];
      if (input.mutation.kind === "create") {
        if (existing !== undefined) throw new Error(`Cycle already exists: ${entity.value.id}`);
        if (input.mutation.after.kind !== "cycle") {
          throw new Error("Cycles source accepts Cycle entities only");
        }
        return appendMarkdownBlock(
          input.markdown,
          serializeCycleForMutation(input.mutation.after.value, input.options?.cycleTimezone),
        );
      }
      if (existing === undefined || location === undefined) {
        throw new Error(`Cycle is absent from authoritative source: ${entity.value.id}`);
      }
      assertExpected({ kind: "cycle", value: existing }, input.mutation.before, input.sourcePath);
      if (input.mutation.kind === "delete") return deleteRecord(input.markdown, location);
      assertReplaceIdentity(input.mutation);
      if (input.mutation.after.kind !== "cycle") throw new Error("Cycles source accepts Cycle entities only");
      return replaceRecord(
        input.markdown,
        location,
        serializeCycleForMutation(input.mutation.after.value, input.options?.cycleTimezone),
      );
    }
  }
}

export function serializeTrailNewDomainSource(source: TrailNewDomainSource): string {
  switch (source.kind) {
    case "initiative":
      return serializeInitiativeMarkdown(source.initiative);
    case "project":
      return serializeProjectMarkdown({ issues: [], milestones: [], project: source.project });
  }
}
