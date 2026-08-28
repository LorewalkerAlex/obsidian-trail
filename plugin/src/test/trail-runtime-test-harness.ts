import type { TrailInitiative, TrailProject } from "../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
  type TrailRuntimeStore,
} from "../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "./trail-test-fixtures";

export function createTrailTestRuntimeStore(): TrailRuntimeStore {
  const initiative: TrailInitiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project: TrailProject = {
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const projectB: TrailProject = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const runtimeStore = createTrailRuntimeStore();

  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });

  return runtimeStore;
}
