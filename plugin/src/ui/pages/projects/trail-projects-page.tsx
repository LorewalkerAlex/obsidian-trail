import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { isTrailTerminalStatusDefinition } from "../../../domain/rules/trail-status-rules";
import {
  selectIsTrailEntityPending,
  selectTrailReadableConfiguration,
  selectTrailReadableProjectById,
  selectTrailReadableProjectIds,
  selectTrailReadableWorkflowIssueIdsByProject,
} from "../../../query/shared/trail-effective-query";
import {
  selectTrailEntitySourceIssues,
  selectTrailProjectSourceIssues,
} from "../../../query/shared/trail-source-health-query";
import { selectTrailStatusDefinition } from "../../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailWorkflowIssueRow } from "../../entities/trail-workflow-issue-row";
import {
  runTrailMutationAction,
  runTrailReceipt,
} from "../../interactions/trail-action";
import { TrailDataIssuePanel } from "../../patterns/trail-feedback";
import { TrailStatusPicker } from "../../patterns/trail-status-picker";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

export function TrailProjectsPage(props: {
  readonly actions: Pick<TrailUiActions, "issues" | "projects">;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const projectIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailReadableProjectIds),
  );
  const configuration = useStore(
    props.runtimeStore,
    selectTrailReadableConfiguration,
  );
  const projectSourceIssues = useStore(
    props.runtimeStore,
    useShallow(selectTrailProjectSourceIssues),
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
    if (!props.writable || projectDraft.trim() === "") return;
    runTrailReceipt(
      () => props.actions.projects.create(projectDraft),
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
              disabled={!props.writable}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setProjectDraft(event.target.value)}
              placeholder="Create an outcome-focused Project"
              value={projectDraft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={!props.writable || projectDraft.trim() === ""}
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

      {projectSourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={projectSourceIssues.map((issue) => `${issue.sourcePath}: ${issue.message}`)}
          message="Valid Project sources remain visible. Actions stay disabled for any source Trail cannot trust."
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
              <TrailProjectNavigationItem
                isSelected={projectId === effectiveSelectedProjectId}
                key={projectId}
                onSelect={() => setSelectedProjectId(projectId)}
                projectId={projectId}
                runtimeStore={props.runtimeStore}
              />
            ))}
          </aside>
          {configuration === null ? null : (
            <TrailProjectWorkspace
              actions={props.actions}
              configuration={configuration}
              onError={setWorkflowError}
              projectId={effectiveSelectedProjectId}
              runtimeStore={props.runtimeStore}
              writable={props.writable}
            />
          )}
        </div>
      )}
    </main>
  );
}

function TrailProjectNavigationItem(props: {
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const project = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableProjectById(state, props.projectId),
  );
  if (project === undefined) return null;
  return (
    <button
      aria-current={props.isSelected ? "true" : undefined}
      className={props.isSelected ? "is-active" : undefined}
      onClick={props.onSelect}
      type="button"
    >
      {project.title}
    </button>
  );
}

function TrailProjectWorkspace(props: {
  readonly actions: Pick<TrailUiActions, "issues" | "projects">;
  readonly configuration: NonNullable<ReturnType<typeof selectTrailReadableConfiguration>>;
  readonly onError: (message: string | undefined) => void;
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const project = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableProjectById(state, props.projectId),
  );
  const issueIds = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailReadableWorkflowIssueIdsByProject(state, props.projectId)),
  );
  const pending = useStore(
    props.runtimeStore,
    (state) => selectIsTrailEntityPending(state, props.projectId),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailEntitySourceIssues(state, props.projectId)),
  );
  const [issueDraft, setIssueDraft] = useState("");

  if (project === undefined) return null;
  const projectStatus = selectTrailStatusDefinition(
    props.configuration,
    "project",
    project.statusDefinitionId,
  );
  const sourceIsHealthy = sourceIssues.length === 0;
  const actionsDisabled = !props.writable || pending || !sourceIsHealthy;
  const projectIsTerminal = projectStatus !== undefined
    && isTrailTerminalStatusDefinition(projectStatus);

  const requestStatus = (targetStatusDefinitionId: string): void => {
    if (actionsDisabled || targetStatusDefinitionId === project.statusDefinitionId) return;
    runTrailMutationAction(
      () => props.actions.projects.changeStatus(project, targetStatusDefinitionId),
      { onError: props.onError },
    );
  };

  const submitIssue = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (actionsDisabled || projectIsTerminal || issueDraft.trim() === "") return;
    runTrailReceipt(
      () => props.actions.issues.create(project.id, issueDraft),
      props.onError,
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
        {pending ? <span className="trail-pending-chip">Saving</span> : null}
      </div>

      <TrailStatusPicker
        ariaLabel={`Project status for ${project.title}`}
        configuration={props.configuration}
        disabled={actionsDisabled}
        entityType="project"
        onChange={requestStatus}
        value={project.statusDefinitionId}
      />

      {sourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={sourceIssues.map((issue) => issue.message)}
          message="Trail keeps the last known good Project visible and pauses actions for this source until the Markdown is valid again."
          title="This Project file has a data issue."
        />
      ) : null}

      {projectIsTerminal ? (
        <p className="trail-project-terminal-note">
          Reopen this Project before adding new Workflow Issues.
        </p>
      ) : null}

      <form className="trail-capture__form" onSubmit={submitIssue}>
        <label className="trail-capture__field">
          <span className="screen-reader-text">Workflow Issue title</span>
          <input
            autoComplete="off"
            disabled={actionsDisabled || projectIsTerminal}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setIssueDraft(event.target.value)}
            placeholder="Add a Workflow Issue"
            value={issueDraft}
          />
        </label>
        <button
          className="mod-cta trail-capture__button"
          disabled={actionsDisabled || projectIsTerminal || issueDraft.trim() === ""}
          type="submit"
        >
          Add Issue
        </button>
      </form>

      <div className="trail-section-heading trail-section-heading--list">
        <div>
          <h3>Issues</h3>
          <p>Backlog by default; update status as work progresses.</p>
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
            <TrailWorkflowIssueRow
              actions={props.actions.issues}
              configuration={props.configuration}
              issueId={issueId}
              key={issueId}
              onError={props.onError}
              runtimeStore={props.runtimeStore}
              sourceIsHealthy={sourceIsHealthy}
              writable={props.writable}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
