import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { validateTrailWorkspaceGraph } from "./trail-workspace-validation";

function emptyDomain() {
  return {
    cyclesById: new Map(),
    initiativesById: new Map(),
    issuesById: new Map(),
    milestonesById: new Map(),
    projectsById: new Map(),
  };
}

describe("Trail workspace validation", () => {
  it("accepts a valid cross-record graph", () => {
    const configuration = createTrailTestConfiguration();
    const domain = emptyDomain();
    domain.projectsById.set("project-a", {
      id: "project-a",
      labelIds: ["label-work"],
      statusDefinitionId: "project-unstarted",
      title: "Project A",
    });
    domain.issuesById.set("issue-a", {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-backlog",
      title: "Issue A",
    });
    domain.cyclesById.set("cycle-a", {
      id: "cycle-a",
      issueIds: ["issue-a"],
      plannedEnd: 10,
      startedAt: 1,
    });
    expect(validateTrailWorkspaceGraph({
      configuration,
      domain,
      workspaceState: createTrailTestWorkspaceState(),
    })).toEqual([]);
  });

  it("enforces status-conditioned lifecycle and completed-project invariants", () => {
    const configuration = createTrailTestConfiguration();
    const domain = emptyDomain();
    domain.projectsById.set("project-a", {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-completed",
      title: "Completed Project",
    });
    domain.issuesById.set("issue-active", {
      context: "workflow",
      createdAt: 1,
      id: "issue-active",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-started",
      title: "Active Issue",
    });
    domain.issuesById.set("issue-completed", {
      context: "workflow",
      createdAt: 1,
      id: "issue-completed",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-completed",
      title: "Completed Issue",
    });
    domain.issuesById.set("issue-backlog", {
      context: "workflow",
      createdAt: 1,
      id: "issue-backlog",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-backlog",
      terminalAt: 50,
      title: "Backlog Issue",
    });

    const codes = validateTrailWorkspaceGraph({
      configuration,
      domain,
      workspaceState: createTrailTestWorkspaceState(),
    }).map(({ code }) => code);

    expect(codes).toContain("domain.issue.started-at-required");
    expect(codes).toContain("domain.issue.completed-estimate-required");
    expect(codes).toContain("domain.issue.terminal-at-required");
    expect(codes).toContain("domain.issue.terminal-at-nonterminal");
    expect(codes).toContain("domain.project.completed-active-child");
  });

  it("rejects cross-record reference and open-cycle violations", () => {
    const domain = emptyDomain();
    domain.projectsById.set("shared-id", {
      id: "shared-id",
      initiativeId: "missing-initiative",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project",
    });
    domain.issuesById.set("shared-id", {
      context: "triage",
      due: 10,
      id: "shared-id",
      labelIds: [],
      title: "Triage",
    });
    domain.cyclesById.set("cycle-a", {
      id: "cycle-a",
      issueIds: ["shared-id"],
      plannedEnd: 10,
      startedAt: 1,
    });
    domain.cyclesById.set("cycle-b", {
      id: "cycle-b",
      issueIds: [],
      plannedEnd: 20,
      startedAt: 11,
    });

    const codes = validateTrailWorkspaceGraph({
      configuration: createTrailTestConfiguration(),
      domain,
      workspaceState: createTrailTestWorkspaceState(),
    }).map(({ code }) => code);
    expect(codes).toContain("workspace.entity-id.duplicate");
    expect(codes).toContain("reference.project.initiative-missing");
    expect(codes).toContain("workspace.cycle.multiple-open");
    expect(codes).toContain("domain.cycle.triage-member");
  });

  it("enforces status, Milestone, and Label scope invariants", () => {
    const baseConfiguration = createTrailTestConfiguration();
    const configuration = {
      ...baseConfiguration,
      labelGroups: [
        ...baseConfiguration.labelGroups,
        {
          id: "group-initiative-only",
          name: "Initiative only",
          registeredEntityTypes: ["initiative" as const],
          selectionMode: "multiple" as const,
        },
      ],
      labels: [
        ...baseConfiguration.labels,
        { groupId: "group-area", id: "label-home", name: "Home" },
        {
          groupId: "group-initiative-only",
          id: "label-initiative-only",
          name: "Initiative only",
        },
      ],
    };
    const domain = emptyDomain();
    domain.projectsById.set("project-a", {
      id: "project-a",
      labelIds: ["label-work", "label-home"],
      statusDefinitionId: "issue-unstarted",
      title: "Project A",
    });
    domain.projectsById.set("project-b", {
      id: "project-b",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project B",
    });
    domain.milestonesById.set("milestone-b", {
      id: "milestone-b",
      projectId: "project-b",
      title: "Milestone B",
    });
    domain.issuesById.set("issue-a", {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: ["label-initiative-only"],
      milestoneId: "milestone-b",
      projectId: "project-a",
      statusDefinitionId: "project-unstarted",
      title: "Issue A",
    });

    const codes = validateTrailWorkspaceGraph({
      configuration,
      domain,
      workspaceState: createTrailTestWorkspaceState(),
    }).map(({ code }) => code);

    expect(codes.filter((code) => code === "reference.status-definition.invalid"))
      .toHaveLength(2);
    expect(codes).toContain("reference.issue.milestone-project-mismatch");
    expect(codes).toContain("reference.label.scope");
    expect(codes).toContain("domain.label-group.single-selection");
  });
});
