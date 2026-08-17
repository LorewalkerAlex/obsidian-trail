import { describe, expect, it } from "vitest";

import {
  buildTrailCommittedRuntimeCandidate,
  buildTrailRuntimeCandidateAfterChanges,
} from "../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../test/trail-test-fixtures";
import { runtimeChangesFromPersistenceResult } from "./trail-authoritative-source-sync";

const projectPath = "Trail/Projects/0001 Project A.md";
const projectlessPath = "Trail/Collections/Projectless Issues.md";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};
const milestone = {
  id: "milestone-a",
  projectId: project.id,
  title: "Milestone A",
};
const beforeIssue = {
  context: "workflow" as const,
  createdAt: 1,
  id: "issue-a",
  labelIds: [],
  milestoneId: milestone.id,
  projectId: project.id,
  statusDefinitionId: "issue-unstarted",
  title: "Issue A",
};
const afterIssue = { ...beforeIssue, milestoneId: undefined, projectId: undefined };

describe("Trail Integrity Batch settlement", () => {
  it("releases a deleted source before accepting prepared same-identity targets", () => {
    const committed = {
      ...buildTrailCommittedRuntimeCandidate({
        pluginData: {
          configuration: createTrailTestConfiguration(),
          workspaceState: createTrailTestWorkspaceState(),
        },
        sources: [
          {
            issues: [beforeIssue],
            kind: "project" as const,
            milestones: [milestone],
            project,
            sourcePath: projectPath,
          },
          {
            issues: [],
            kind: "projectless-issues" as const,
            sourcePath: projectlessPath,
          },
        ],
      }),
      revision: 1,
    };

    const targetResult = {
      change: { kind: "mutated" as const },
      kind: "domain-source" as const,
      result: {
        issues: [],
        kind: "accepted" as const,
        snapshot: {
          issues: [afterIssue],
          kind: "projectless-issues" as const,
          sourcePath: projectlessPath,
        },
      },
    };
    const deleteResult = {
      kind: "domain-source-deleted" as const,
      sourcePath: projectPath,
    };

    const changes = runtimeChangesFromPersistenceResult({
      commandId: "delete-project",
      operations: [targetResult, deleteResult],
      topology: "integrity-batch",
    });
    expect(changes.map(({ kind }) => kind)).toEqual([
      "remove-domain-source",
      "replace-domain-source",
    ]);

    const candidate = buildTrailRuntimeCandidateAfterChanges({
      changes,
      committed,
      health: { sourceIssuesByPath: {} },
    });

    expect(candidate.committed.authoritative.domain.projectsById.has(project.id)).toBe(false);
    expect(candidate.committed.authoritative.domain.milestonesById.has(milestone.id)).toBe(false);
    expect(candidate.committed.authoritative.domain.issuesById.get(afterIssue.id)).toEqual(afterIssue);
    expect(candidate.committed.ownership.sourceByEntityId.get(afterIssue.id)).toBe(projectlessPath);
  });
});
