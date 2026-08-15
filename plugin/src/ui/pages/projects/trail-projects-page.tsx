import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import {
  STATUS_CATEGORIES,
  resolveStatusDefinition,
  type TrailConfiguration,
} from "../../../domain/trail-configuration";
import type { TrailWorkflowIssue } from "../../../domain/trail-issue";
import {
  selectEffectiveProjectById,
  selectEffectiveProjectIds,
  selectEffectiveWorkflowIssueById,
  selectEffectiveWorkflowIssueIdsByProject,
  selectIsWorkflowEntityPending,
} from "../../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import {
  selectEntitySourceIssues,
  selectWorkflowRootSourceIssues,
  selectWorkflowSourceIssues,
} from "../../../query/trail-source-health";
import {
  WorkflowNeedsInputError,
  type WorkflowEntryReceipt,
} from "../../../domain/trail-workflow-entry";
import {
  observeTrailActionCompletion,
  runTrailAction,
  trailErrorMessage,
} from "../../interactions/trail-action";
import { TrailDataIssuePanel } from "../../patterns/trail-feedback";

export interface TrailProjectsPageActions {
  readonly onCreateProject: (title: string) => WorkflowEntryReceipt;
  readonly onCreateWorkflowIssue: (
    projectId: string,
    title: string,
  ) => WorkflowEntryReceipt;
  readonly onWorkflowStatusChange: (
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ) => WorkflowEntryReceipt;
}

export interface TrailProjectsPageProps extends TrailProjectsPageActions {
  readonly runtimeStore: TrailRuntimeStore;
}

function statusCategoryLabel(category: string): string {
  switch (category) {
    case "backlog": return "Backlog";
    case "unstarted": return "Unstarted";
    case "started": return "Started";
    case "completed": return "Completed";
    case "canceled": return "Canceled";
    default: return category;
  }
}

export function TrailProjectsPage({
  onCreateProject,
  onCreateWorkflowIssue,
  onWorkflowStatusChange,
  runtimeStore,
}: TrailProjectsPageProps) {
  const projectIds = useStore(runtimeStore, useShallow(selectEffectiveProjectIds));
  const configuration = useStore(
    runtimeStore,
    (state) => state.committed.configuration,
  );
  const workflowSourceIssues = useStore(
    runtimeStore,
    useShallow(selectWorkflowSourceIssues),
  );
  const workflowRootIsValid = useStore(
    runtimeStore,
    (state) => selectWorkflowRootSourceIssues(state).length === 0,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [projectDraft, setProjectDraft] = useState("");
  const [workflowError, setWorkflowError] = useState<string>();
  const effectiveSelectedProjectId = selectedProjectId !== undefined
    && projectIds.includes(selectedProjectId)
      ? selectedProjectId
      : projectIds[0];

  const submitProject = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (projectDraft.trim() === "") return;
    runTrailAction(
      () => onCreateProject(projectDraft),
      setWorkflowError,
      (receipt) => {
        setProjectDraft("");
        setSelectedProjectId(receipt.entityId);
      },
    );
  };

  return (
    <main className="trail-projects">
      <section className="trail-project-create" aria-labelledby="trail-project-create-title">
        <div className="trail-section-heading">
          <div>
            <h2 id="trail-project-create-title">Projects</h2>
            <p>New Projects start in the configured Unstarted default.</p>
          </div>
          <span className="trail-count" aria-label={`${projectIds.length} projects`}>
            {projectIds.length}
          </span>
        </div>
        <form className="trail-capture__form" onSubmit={submitProject}>
          <label className="trail-capture__field">
            <span className="screen-reader-text">Project title</span>
            <input
              autoComplete="off"
              disabled={!workflowRootIsValid}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setProjectDraft(event.target.value);
              }}
              placeholder="Create an outcome-focused Project"
              value={projectDraft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={!workflowRootIsValid || projectDraft.trim() === ""}
            type="submit"
          >
            Create Project
          </button>
        </form>
      </section>

      {workflowError !== undefined ? (
        <p className="trail-inline-error trail-management-error" role="alert">
          {workflowError}
        </p>
      ) : null}

      {workflowSourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={workflowSourceIssues.map((issue) => (
            `${issue.filePath}: ${issue.message}`
          ))}
          message="Valid Project sources remain visible. Mutations are paused only where the affected source is not trustworthy."
          title="Workflow data needs attention."
        />
      ) : null}

      {projectIds.length === 0 || effectiveSelectedProjectId === undefined ? (
        <div className="trail-empty-state">
          <p>No Projects yet.</p>
          <span>Create one to start the Workflow execution path.</span>
        </div>
      ) : (
        <div className="trail-projects-layout">
          <aside className="trail-project-list" aria-label="Projects">
            {projectIds.map((projectId) => (
              <ProjectNavigationItem
                isSelected={projectId === effectiveSelectedProjectId}
                key={projectId}
                onSelect={() => setSelectedProjectId(projectId)}
                projectId={projectId}
                runtimeStore={runtimeStore}
              />
            ))}
          </aside>
          <ProjectWorkspace
            configuration={configuration}
            onCreateWorkflowIssue={onCreateWorkflowIssue}
            onError={setWorkflowError}
            onWorkflowStatusChange={onWorkflowStatusChange}
            projectId={effectiveSelectedProjectId}
            runtimeStore={runtimeStore}
          />
        </div>
      )}
    </main>
  );
}

interface ProjectNavigationItemProps {
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}

function ProjectNavigationItem({
  isSelected,
  onSelect,
  projectId,
  runtimeStore,
}: ProjectNavigationItemProps) {
  const project = useStore(
    runtimeStore,
    (state) => selectEffectiveProjectById(state, projectId),
  );
  if (project === undefined) return null;

  return (
    <button
      aria-current={isSelected ? "true" : undefined}
      className={isSelected ? "is-active" : undefined}
      onClick={onSelect}
      type="button"
    >
      {project.title}
    </button>
  );
}

interface ProjectWorkspaceProps {
  readonly configuration: TrailConfiguration | null;
  readonly onCreateWorkflowIssue: TrailProjectsPageActions["onCreateWorkflowIssue"];
  readonly onError: (message: string | undefined) => void;
  readonly onWorkflowStatusChange: TrailProjectsPageActions["onWorkflowStatusChange"];
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}

function ProjectWorkspace({
  configuration,
  onCreateWorkflowIssue,
  onError,
  onWorkflowStatusChange,
  projectId,
  runtimeStore,
}: ProjectWorkspaceProps) {
  const project = useStore(
    runtimeStore,
    (state) => selectEffectiveProjectById(state, projectId),
  );
  const issueIds = useStore(
    runtimeStore,
    useShallow((state) => selectEffectiveWorkflowIssueIdsByProject(state, projectId)),
  );
  const projectIsPending = useStore(
    runtimeStore,
    (state) => selectIsWorkflowEntityPending(state, projectId),
  );
  const sourceIssues = useStore(
    runtimeStore,
    (state) => selectEntitySourceIssues(state, projectId),
  );
  const workflowRootIsValid = useStore(
    runtimeStore,
    (state) => selectWorkflowRootSourceIssues(state).length === 0,
  );
  const [issueDraft, setIssueDraft] = useState("");

  if (project === undefined || configuration === null) return null;
  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    project.statusDefinitionId,
  );
  const sourceIsValid = workflowRootIsValid && sourceIssues.length === 0;

  const submitIssue = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!sourceIsValid || issueDraft.trim() === "") return;
    runTrailAction(
      () => onCreateWorkflowIssue(project.id, issueDraft),
      onError,
      () => setIssueDraft(""),
    );
  };

  return (
    <section className="trail-project-workspace" aria-labelledby="trail-project-workspace-title">
      <div className="trail-project-workspace__header">
        <div>
          <p className="trail-app__eyebrow">Project</p>
          <h2 id="trail-project-workspace-title">{project.title}</h2>
          <span>{projectStatus?.name ?? "Invalid status"}</span>
        </div>
        {projectIsPending ? <span className="trail-pending-chip">Saving</span> : null}
      </div>

      {sourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={sourceIssues.map((sourceIssue) => sourceIssue.message)}
          message="Trail keeps the last known good Project state visible and pauses mutations for this source until the Markdown is valid again."
          title="This Project file has a data issue."
        />
      ) : null}

      <form className="trail-capture__form" onSubmit={submitIssue}>
        <label className="trail-capture__field">
          <span className="screen-reader-text">Workflow Issue title</span>
          <input
            autoComplete="off"
            disabled={!sourceIsValid}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setIssueDraft(event.target.value);
            }}
            placeholder="Add a Workflow Issue"
            value={issueDraft}
          />
        </label>
        <button
          className="mod-cta trail-capture__button"
          disabled={!sourceIsValid || issueDraft.trim() === ""}
          type="submit"
        >
          Add Issue
        </button>
      </form>

      <div className="trail-section-heading trail-section-heading--list">
        <div>
          <h3>Issues</h3>
          <p>Backlog by default; status changes use the Formal mutation path.</p>
        </div>
        <span className="trail-count" aria-label={`${issueIds.length} workflow issues`}>
          {issueIds.length}
        </span>
      </div>

      {issueIds.length === 0 ? (
        <div className="trail-empty-state trail-empty-state--compact">
          <p>No Workflow Issues yet.</p>
          <span>Add one above to begin execution.</span>
        </div>
      ) : (
        <ol className="trail-workflow-issue-list">
          {issueIds.map((issueId) => (
            <WorkflowIssueRow
              configuration={configuration}
              issueId={issueId}
              key={issueId}
              onError={onError}
              onStatusChange={onWorkflowStatusChange}
              runtimeStore={runtimeStore}
              sourceIsValid={sourceIsValid}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

interface WorkflowIssueRowProps {
  readonly configuration: TrailConfiguration;
  readonly issueId: string;
  readonly onError: (message: string | undefined) => void;
  readonly onStatusChange: TrailProjectsPageActions["onWorkflowStatusChange"];
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceIsValid: boolean;
}

function WorkflowIssueRow({
  configuration,
  issueId,
  onError,
  onStatusChange,
  runtimeStore,
  sourceIsValid,
}: WorkflowIssueRowProps) {
  const issue = useStore(
    runtimeStore,
    (state) => selectEffectiveWorkflowIssueById(state, issueId),
  );
  const isPending = useStore(
    runtimeStore,
    (state) => selectIsWorkflowEntityPending(state, issueId),
  );
  const [completionBaseline, setCompletionBaseline] = useState<TrailWorkflowIssue>();
  const [completionTargetId, setCompletionTargetId] = useState<string>();
  const [estimateDraft, setEstimateDraft] = useState("");

  if (issue === undefined) return null;
  const status = resolveStatusDefinition(
    configuration.statuses.issue,
    issue.statusDefinitionId,
  );
  const actionsDisabled = isPending || !sourceIsValid;

  const observeReceipt = (receipt: WorkflowEntryReceipt): void => {
    observeTrailActionCompletion(receipt, onError);
  };

  const requestStatus = (targetStatusDefinitionId: string): void => {
    if (actionsDisabled || targetStatusDefinitionId === issue.statusDefinitionId) {
      return;
    }
    try {
      observeReceipt(onStatusChange(issue, targetStatusDefinitionId));
    } catch (error: unknown) {
      if (error instanceof WorkflowNeedsInputError && error.requiredInput === "estimate") {
        setCompletionBaseline(issue);
        setCompletionTargetId(targetStatusDefinitionId);
        setEstimateDraft(issue.estimate?.toString() ?? "");
        onError(undefined);
        return;
      }
      onError(trailErrorMessage(error));
    }
  };

  const submitEstimate = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      completionBaseline === undefined
      || completionTargetId === undefined
      || estimateDraft.trim() === ""
      || actionsDisabled
    ) {
      return;
    }
    const estimate = Number(estimateDraft);
    const receipt = runTrailAction(
      () => onStatusChange(
        completionBaseline,
        completionTargetId,
        estimate,
      ),
      onError,
    );
    if (receipt !== undefined) {
      setCompletionBaseline(undefined);
      setCompletionTargetId(undefined);
      setEstimateDraft("");
    }
  };

  return (
    <li className="trail-workflow-issue-row">
      <div className="trail-workflow-issue-row__main">
        <strong>{issue.title}</strong>
        <span>
          {status?.name ?? "Invalid status"}
          {issue.estimate !== undefined ? ` · Estimate ${issue.estimate}` : ""}
        </span>
      </div>
      <label className="trail-status-picker">
        <span className="screen-reader-text">Status for {issue.title}</span>
        <select
          disabled={actionsDisabled}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            requestStatus(event.target.value);
          }}
          value={issue.statusDefinitionId}
        >
          {STATUS_CATEGORIES.map((category) => (
            <optgroup key={category} label={statusCategoryLabel(category)}>
              {configuration.statuses.issue[category].definitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {completionBaseline !== undefined && completionTargetId !== undefined ? (
        <form className="trail-estimate-gate" onSubmit={submitEstimate}>
          <label>
            <span>Estimate required to complete</span>
            <input
              autoFocus
              disabled={actionsDisabled}
              min="0"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setEstimateDraft(event.target.value);
              }}
              step="1"
              type="number"
              value={estimateDraft}
            />
          </label>
          <div className="trail-issue-editor__actions">
            <button
              className="mod-cta"
              disabled={actionsDisabled || estimateDraft.trim() === ""}
              type="submit"
            >
              Complete
            </button>
            <button
              onClick={() => {
                setCompletionBaseline(undefined);
                setCompletionTargetId(undefined);
                setEstimateDraft("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
