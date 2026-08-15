import type {
  TrailCycle,
  TrailInitiative,
  TrailIssue,
  TrailMilestone,
} from "../../domain/model/trail-core-entities";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import {
  trailMutationEntityId,
  type TrailMutationEntity,
  type TrailMutationPlan,
  type TrailStateEffect,
} from "../../mutation/plans/trail-mutation-plan";
import {
  sortTrailProjectIds,
  sortTrailTriageIssueIds,
} from "../indexes/trail-runtime-indexes";
import type {
  TrailRuntimeState,
  TrailRuntimeStore,
} from "../store/trail-runtime-store";

interface TrailEffectiveMaps {
  readonly cyclesById: Record<string, TrailCycle>;
  readonly initiativesById: Record<string, TrailInitiative>;
  readonly issuesById: Record<string, TrailIssue>;
  readonly milestonesById: Record<string, TrailMilestone>;
  readonly projectsById: Record<string, TrailProject>;
}

export function addTrailPendingPlan(
  store: TrailRuntimeStore,
  plan: TrailMutationPlan,
): void {
  store.setState((state) => ({
    pending: [...state.pending, plan],
  }));
}

export function removePendingPlan(
  store: TrailRuntimeStore,
  commandId: string,
): void {
  store.setState((state) => ({
    pending: state.pending.filter(
      (plan) => plan.commandId !== commandId,
    ),
  }));
}

function assignEntity(maps: TrailEffectiveMaps, entity: TrailMutationEntity): void {
  switch (entity.kind) {
    case "initiative":
      maps.initiativesById[entity.value.id] = entity.value;
      break;
    case "project":
      maps.projectsById[entity.value.id] = entity.value;
      break;
    case "milestone":
      maps.milestonesById[entity.value.id] = entity.value;
      break;
    case "triage-issue":
    case "workflow-issue":
      maps.issuesById[entity.value.id] = entity.value;
      break;
    case "cycle":
      maps.cyclesById[entity.value.id] = entity.value;
      break;
  }
}

function removeEntity(maps: TrailEffectiveMaps, entity: TrailMutationEntity): void {
  switch (entity.kind) {
    case "initiative":
      delete maps.initiativesById[entity.value.id];
      break;
    case "project":
      delete maps.projectsById[entity.value.id];
      break;
    case "milestone":
      delete maps.milestonesById[entity.value.id];
      break;
    case "triage-issue":
    case "workflow-issue":
      delete maps.issuesById[entity.value.id];
      break;
    case "cycle":
      delete maps.cyclesById[entity.value.id];
      break;
  }
}

function applyEffect(maps: TrailEffectiveMaps, effect: TrailStateEffect): void {
  switch (effect.kind) {
    case "create":
      assignEntity(maps, effect.after);
      break;
    case "replace":
      assignEntity(maps, effect.after);
      break;
    case "delete":
      removeEntity(maps, effect.before);
      break;
  }
}

/** Replays ordered logical effects without knowing feature-specific plan kinds. */
function projectEffectiveMaps(state: TrailRuntimeState): TrailEffectiveMaps {
  const maps: TrailEffectiveMaps = {
    cyclesById: { ...state.committed.authoritative.domain.cyclesById },
    initiativesById: { ...state.committed.authoritative.domain.initiativesById },
    issuesById: { ...state.committed.authoritative.domain.issuesById },
    milestonesById: { ...state.committed.authoritative.domain.milestonesById },
    projectsById: { ...state.committed.authoritative.domain.projectsById },
  };
  for (const plan of state.pending) {
    for (const effect of plan.effects) applyEffect(maps, effect);
  }
  return maps;
}

function planAffectsEntity(
  plan: TrailMutationPlan,
  entityId: string,
  acceptedKinds: ReadonlySet<TrailMutationEntity["kind"]>,
): boolean {
  return plan.effects.some((effect) => {
    const entity = effect.kind === "create" ? effect.after : effect.before;
    return acceptedKinds.has(entity.kind) && trailMutationEntityId(entity) === entityId;
  });
}

function triageIssuesById(
  issuesById: Readonly<Record<string, TrailIssue>>,
): Readonly<Record<string, TrailTriageIssue>> {
  return Object.fromEntries(
    Object.entries(issuesById).filter((entry): entry is [string, TrailTriageIssue] => (
      entry[1].context === "triage"
    )),
  );
}

const TRIAGE_ENTITY_KINDS = new Set<TrailMutationEntity["kind"]>([
  "triage-issue",
]);
const WORKFLOW_ENTITY_KINDS = new Set<TrailMutationEntity["kind"]>([
  "project",
  "workflow-issue",
]);

const STATUS_CATEGORY_ORDER = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const;

const PRIORITY_ORDER = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

function workflowIssueSortKey(
  state: TrailRuntimeState,
  issue: TrailWorkflowIssue,
): readonly [number, number, number, string] {
  const definitions = state.committed.authoritative.configuration?.statuses.issue;
  let categoryIndex: number = STATUS_CATEGORY_ORDER.length;
  if (definitions !== undefined) {
    for (let index = 0; index < STATUS_CATEGORY_ORDER.length; index += 1) {
      const category = STATUS_CATEGORY_ORDER[index];
      if (definitions[category].definitions.some(
        (definition) => definition.id === issue.statusDefinitionId,
      )) {
        categoryIndex = index;
        break;
      }
    }
  }
  const priorityIndex = issue.priority === undefined
    ? Object.keys(PRIORITY_ORDER).length
    : PRIORITY_ORDER[issue.priority];
  const time = categoryIndex === STATUS_CATEGORY_ORDER.indexOf("started")
    ? issue.firstStartedAt ?? issue.createdAt
    : issue.createdAt;
  return [categoryIndex, priorityIndex, time, issue.id];
}

export function selectEffectiveInitiativeById(
  state: TrailRuntimeState,
  initiativeId: string,
): TrailInitiative | undefined {
  return projectEffectiveMaps(state).initiativesById[initiativeId];
}

export function selectEffectiveProjectById(
  state: TrailRuntimeState,
  projectId: string,
): TrailProject | undefined {
  return projectEffectiveMaps(state).projectsById[projectId];
}

export function selectEffectiveMilestoneById(
  state: TrailRuntimeState,
  milestoneId: string,
): TrailMilestone | undefined {
  return projectEffectiveMaps(state).milestonesById[milestoneId];
}

export function selectEffectiveTriageIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailTriageIssue | undefined {
  const issue = projectEffectiveMaps(state).issuesById[issueId];
  return issue?.context === "triage" ? issue : undefined;
}

/** Effective Triage ordering is Due-first, then stable identity. */
export function selectEffectiveTriageIssueIds(
  state: TrailRuntimeState,
): readonly string[] {
  return sortTrailTriageIssueIds(triageIssuesById(projectEffectiveMaps(state).issuesById));
}

export function selectEffectiveIssueIdSet(
  state: TrailRuntimeState,
): ReadonlySet<string> {
  return new Set(Object.keys(projectEffectiveMaps(state).issuesById));
}

export function selectIsTriageIssuePending(
  state: TrailRuntimeState,
  issueId: string,
): boolean {
  return state.pending.some((plan) => (
    planAffectsEntity(plan, issueId, TRIAGE_ENTITY_KINDS)
  ));
}

export function selectEffectiveProjectIds(
  state: TrailRuntimeState,
): readonly string[] {
  return sortTrailProjectIds(projectEffectiveMaps(state).projectsById);
}

export function selectEffectiveWorkflowIssueById(
  state: TrailRuntimeState,
  issueId: string,
): TrailWorkflowIssue | undefined {
  const issue = projectEffectiveMaps(state).issuesById[issueId];
  return issue?.context === "workflow" ? issue : undefined;
}

export function selectEffectiveWorkflowIssueIdsByProject(
  state: TrailRuntimeState,
  projectId: string,
): readonly string[] {
  return Object.values(projectEffectiveMaps(state).issuesById)
    .filter((issue): issue is TrailWorkflowIssue => (
      issue.context === "workflow" && issue.projectId === projectId
    ))
    .sort((left, right) => {
      const leftKey = workflowIssueSortKey(state, left);
      const rightKey = workflowIssueSortKey(state, right);
      for (let index = 0; index < leftKey.length - 1; index += 1) {
        const leftValue = leftKey[index];
        const rightValue = rightKey[index];
        if (leftValue !== rightValue) {
          return Number(leftValue) - Number(rightValue);
        }
      }
      return String(leftKey[3]).localeCompare(String(rightKey[3]));
    })
    .map((issue) => issue.id);
}

export function selectEffectiveCycleById(
  state: TrailRuntimeState,
  cycleId: string,
): TrailCycle | undefined {
  return projectEffectiveMaps(state).cyclesById[cycleId];
}

export function selectIsWorkflowEntityPending(
  state: TrailRuntimeState,
  entityId: string,
): boolean {
  return state.pending.some((plan) => (
    planAffectsEntity(plan, entityId, WORKFLOW_ENTITY_KINDS)
  ));
}

export function selectEffectiveEntityIdSet(
  state: TrailRuntimeState,
): ReadonlySet<string> {
  const effective = projectEffectiveMaps(state);
  return new Set([
    ...Object.keys(effective.initiativesById),
    ...Object.keys(effective.projectsById),
    ...Object.keys(effective.milestonesById),
    ...Object.keys(effective.issuesById),
    ...Object.keys(effective.cyclesById),
  ]);
}
