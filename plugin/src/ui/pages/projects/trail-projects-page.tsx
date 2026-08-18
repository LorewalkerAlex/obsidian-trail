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
  selectTrailReadableInitiativeById,
  selectTrailReadableInitiativeIds,
  selectTrailReadableMilestoneIdsByProject,
  selectTrailReadableProjectById,
  selectTrailReadableProjectIds,
  selectTrailReadableProjectIdsByInitiative,
  selectTrailReadableUnassignedProjectIds,
  selectTrailReadableWorkflowIssueIdsByProject,
} from "../../../query/shared/trail-effective-query";
import {
  selectTrailEntitySourceIssues,
  selectTrailProjectSourceIssues,
} from "../../../query/shared/trail-source-health-query";
import { selectTrailStatusDefinition } from "../../../query/shared/trail-status-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailMilestoneRow } from "../../entities/trail-milestone-row";
import {
  runTrailMutationAction,
  runTrailReceipt,
} from "../../interactions/trail-action";
import { parseTrailLocalDateTime } from "../../interactions/trail-local-date-time";
import { TrailDataIssuePanel } from "../../patterns/trail-feedback";
import { TrailProjectPropertiesDialog } from "../../patterns/trail-project-properties-dialog";
import { TrailStatusPicker } from "../../patterns/trail-status-picker";
import { TrailWorkflowPresentation } from "../../patterns/trail-workflow-presentation";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

export function TrailProjectsPage(props: {
  readonly actions: Pick<TrailUiActions, "initiatives" | "issues" | "milestones" | "projects">;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const initiativeIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailReadableInitiativeIds),
  );
  const projectIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailReadableProjectIds),
  );
  const unassignedProjectIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailReadableUnassignedProjectIds),
  );
  const configuration = useStore(
    props.runtimeStore,
    selectTrailReadableConfiguration,
  );
  const projectSourceIssues = useStore(
    props.runtimeStore,
    useShallow(selectTrailProjectSourceIssues),
  );
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [initiativeDraft, setInitiativeDraft] = useState("");
  const [projectDraft, setProjectDraft] = useState("");
  const [workflowError, setWorkflowError] = useState<string>();

  const effectiveSelectedProjectId = selectedProjectId !== undefined
    && projectIds.includes(selectedProjectId)
      ? selectedProjectId
      : undefined;
  const effectiveSelectedInitiativeId = selectedInitiativeId !== undefined
    && initiativeIds.includes(selectedInitiativeId)
      ? selectedInitiativeId
      : undefined;
  const atRoot = effectiveSelectedProjectId === undefined
    && effectiveSelectedInitiativeId === undefined;

  const submitInitiative = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!props.writable || initiativeDraft.trim() === "") return;
    runTrailReceipt(
      () => props.actions.initiatives.create(initiativeDraft),
      setWorkflowError,
      (receipt) => {
        setInitiativeDraft("");
        setSelectedProjectId(undefined);
        setSelectedInitiativeId(receipt.entityId);
      },
    );
  };

  const submitProject = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!props.writable || projectDraft.trim() === "") return;
    runTrailReceipt(
      () => props.actions.projects.create(projectDraft),
      setWorkflowError,
      (receipt) => {
        setProjectDraft("");
        setSelectedInitiativeId(undefined);
        setSelectedProjectId(receipt.entityId);
      },
    );
  };

  const navigateRoot = (): void => {
    setSelectedProjectId(undefined);
    setSelectedInitiativeId(undefined);
  };

  const navigateInitiative = (initiativeId: string): void => {
    setSelectedProjectId(undefined);
    setSelectedInitiativeId(initiativeId);
  };

  return (
    <main className="trail-projects">
      {atRoot ? (
        <>
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

          <section className="trail-project-create" aria-labelledby="trail-initiative-create-title">
            <div className="trail-section-heading">
              <div>
                <h2 id="trail-initiative-create-title">Initiatives</h2>
                <p>Group Projects under the longer-term outcomes they advance.</p>
              </div>
              <span className="trail-count" aria-label={`${initiativeIds.length} initiatives`}>
                {initiativeIds.length}
              </span>
            </div>
            <form className="trail-capture__form" onSubmit={submitInitiative}>
              <label className="trail-capture__field">
                <span className="screen-reader-text">Initiative title</span>
                <input
                  autoComplete="off"
                  disabled={!props.writable}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setInitiativeDraft(event.target.value)}
                  placeholder="Create a long-term Initiative"
                  value={initiativeDraft}
                />
              </label>
              <button
                className="mod-cta trail-capture__button"
                disabled={!props.writable || initiativeDraft.trim() === ""}
                type="submit"
              >
                Create Initiative
              </button>
            </form>
          </section>
        </>
      ) : null}

      {workflowError !== undefined ? (
        <p className="trail-inline-error trail-management-error" role="alert">
          {workflowError}
        </p>
      ) : null}

      {projectSourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={projectSourceIssues.map((issue) => `${issue.sourcePath}: ${issue.message}`)}
          message="Valid Project sources remain visible. Actions stay disabled for any Project source Trail cannot trust."
          title="Workflow data needs attention."
        />
      ) : null}

      {configuration === null ? null : effectiveSelectedProjectId !== undefined ? (
        <TrailProjectWorkspace
          actions={props.actions}
          configuration={configuration}
          onError={setWorkflowError}
          onNavigateInitiative={navigateInitiative}
          onNavigateRoot={navigateRoot}
          projectId={effectiveSelectedProjectId}
          runtimeStore={props.runtimeStore}
          writable={props.writable}
        />
      ) : effectiveSelectedInitiativeId !== undefined ? (
        <TrailInitiativeFocus
          initiativeId={effectiveSelectedInitiativeId}
          onNavigateProject={setSelectedProjectId}
          onNavigateRoot={navigateRoot}
          runtimeStore={props.runtimeStore}
        />
      ) : (
        <TrailProjectsRoot
          initiativeIds={initiativeIds}
          onNavigateInitiative={navigateInitiative}
          onNavigateProject={setSelectedProjectId}
          runtimeStore={props.runtimeStore}
          unassignedProjectIds={unassignedProjectIds}
        />
      )}
    </main>
  );
}

function TrailProjectsRoot(props: {
  readonly initiativeIds: readonly string[];
  readonly onNavigateInitiative: (initiativeId: string) => void;
  readonly onNavigateProject: (projectId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly unassignedProjectIds: readonly string[];
}) {
  return (
    <div className="trail-projects-layout">
      <section className="trail-project-workspace" aria-labelledby="trail-projects-root-initiatives">
        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h2 id="trail-projects-root-initiatives">Initiatives</h2>
            <p>Focus one Initiative to see the Projects advancing it.</p>
          </div>
          <span className="trail-count" aria-label={`${props.initiativeIds.length} initiatives`}>
            {props.initiativeIds.length}
          </span>
        </div>
        {props.initiativeIds.length === 0 ? (
          <div className="trail-empty-state trail-empty-state--compact">
            <p>No Initiatives yet.</p>
            <span>Projects can remain unassigned until a longer-term outcome is clear.</span>
          </div>
        ) : (
          <div className="trail-project-list" aria-label="Initiatives">
            {props.initiativeIds.map((initiativeId) => (
              <TrailInitiativeNavigationItem
                initiativeId={initiativeId}
                key={initiativeId}
                onSelect={() => props.onNavigateInitiative(initiativeId)}
                runtimeStore={props.runtimeStore}
              />
            ))}
          </div>
        )}
      </section>

      <section className="trail-project-workspace" aria-labelledby="trail-projects-root-unassigned">
        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h2 id="trail-projects-root-unassigned">Unassigned Projects</h2>
            <p>Projects without an Initiative remain directly accessible.</p>
          </div>
          <span className="trail-count" aria-label={`${props.unassignedProjectIds.length} unassigned projects`}>
            {props.unassignedProjectIds.length}
          </span>
        </div>
        {props.unassignedProjectIds.length === 0 ? (
          <div className="trail-empty-state trail-empty-state--compact">
            <p>No unassigned Projects.</p>
            <span>Every current Project belongs to an Initiative.</span>
          </div>
        ) : (
          <div className="trail-project-list" aria-label="Unassigned Projects">
            {props.unassignedProjectIds.map((projectId) => (
              <TrailProjectNavigationItem
                key={projectId}
                onSelect={() => props.onNavigateProject(projectId)}
                projectId={projectId}
                runtimeStore={props.runtimeStore}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TrailInitiativeNavigationItem(props: {
  readonly initiativeId: string;
  readonly onSelect: () => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const initiative = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableInitiativeById(state, props.initiativeId),
  );
  const projectIds = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailReadableProjectIdsByInitiative(state, props.initiativeId)),
  );
  if (initiative === undefined) return null;
  return (
    <button onClick={props.onSelect} title={`${projectIds.length} Projects`} type="button">
      {initiative.title}
    </button>
  );
}

function TrailProjectNavigationItem(props: {
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
    <button onClick={props.onSelect} type="button">
      {project.title}
    </button>
  );
}

function TrailInitiativeFocus(props: {
  readonly initiativeId: string;
  readonly onNavigateProject: (projectId: string) => void;
  readonly onNavigateRoot: () => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const initiative = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableInitiativeById(state, props.initiativeId),
  );
  const projectIds = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailReadableProjectIdsByInitiative(state, props.initiativeId)),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailEntitySourceIssues(state, props.initiativeId)),
  );
  if (initiative === undefined) return null;

  return (
    <>
      <nav className="trail-page-nav" aria-label="Projects hierarchy">
        <button onClick={props.onNavigateRoot} type="button">Projects</button>
        <span aria-current="page">{initiative.title}</span>
      </nav>
      <section className="trail-project-workspace" aria-labelledby="trail-initiative-focus-title">
        <div className="trail-project-workspace__header">
          <div>
            <p className="trail-app__eyebrow">Initiative</p>
            <h2 id="trail-initiative-focus-title">{initiative.title}</h2>
            <span>{projectIds.length} Projects</span>
          </div>
        </div>

        {sourceIssues.length > 0 ? (
          <TrailDataIssuePanel
            issues={sourceIssues.map((issue) => issue.message)}
            message="Trail keeps the last known good Initiative visible while its Markdown source needs attention."
            title="This Initiative file has a data issue."
          />
        ) : null}

        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h3>Projects</h3>
            <p>Open a Project to continue execution or change its Initiative relationship.</p>
          </div>
          <span className="trail-count" aria-label={`${projectIds.length} projects in ${initiative.title}`}>
            {projectIds.length}
          </span>
        </div>

        {projectIds.length === 0 ? (
          <div className="trail-empty-state trail-empty-state--compact">
            <p>No Projects in this Initiative.</p>
            <span>Assign an existing Project from its Project Workspace.</span>
          </div>
        ) : (
          <div className="trail-project-list" aria-label={`Projects in ${initiative.title}`}>
            {projectIds.map((projectId) => (
              <TrailProjectNavigationItem
                key={projectId}
                onSelect={() => props.onNavigateProject(projectId)}
                projectId={projectId}
                runtimeStore={props.runtimeStore}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function TrailInitiativeOption(props: {
  readonly initiativeId: string;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const initiative = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableInitiativeById(state, props.initiativeId),
  );
  return initiative === undefined ? null : (
    <option value={initiative.id}>{initiative.title}</option>
  );
}

function TrailProjectWorkspace(props: {
  readonly actions: Pick<TrailUiActions, "issues" | "milestones" | "projects">;
  readonly configuration: NonNullable<ReturnType<typeof selectTrailReadableConfiguration>>;
  readonly onError: (message: string | undefined) => void;
  readonly onNavigateInitiative: (initiativeId: string) => void;
  readonly onNavigateRoot: () => void;
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const project = useStore(
    props.runtimeStore,
    (state) => selectTrailReadableProjectById(state, props.projectId),
  );
  const initiativeIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailReadableInitiativeIds),
  );
  const initiative = useStore(
    props.runtimeStore,
    (state) => project?.initiativeId === undefined
      ? undefined
      : selectTrailReadableInitiativeById(state, project.initiativeId),
  );
  const milestoneIds = useStore(
    props.runtimeStore,
    useShallow((state) => selectTrailReadableMilestoneIdsByProject(state, props.projectId)),
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState("");
  const [milestoneDueDraft, setMilestoneDueDraft] = useState("");
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

  const requestInitiative = (targetValue: string): void => {
    if (actionsDisabled) return;
    const targetInitiativeId = targetValue === "" ? undefined : targetValue;
    if (targetInitiativeId === project.initiativeId) return;
    runTrailMutationAction(
      () => props.actions.projects.changeInitiative(project, targetInitiativeId),
      { onError: props.onError },
    );
  };

  const submitMilestone = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (actionsDisabled || milestoneDraft.trim() === "") return;
    runTrailReceipt(
      () => props.actions.milestones.create(
        project.id,
        milestoneDraft,
        milestoneDueDraft === ""
          ? undefined
          : parseTrailLocalDateTime(
              milestoneDueDraft,
              props.configuration.temporal.timezone,
            ),
      ),
      props.onError,
      () => {
        setMilestoneDraft("");
        setMilestoneDueDraft("");
      },
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
    <>
      <nav className="trail-page-nav" aria-label="Projects hierarchy">
        <button onClick={props.onNavigateRoot} type="button">Projects</button>
        {initiative !== undefined ? (
          <button onClick={() => props.onNavigateInitiative(initiative.id)} type="button">
            {initiative.title}
          </button>
        ) : null}
        <span aria-current="page">{project.title}</span>
      </nav>
      <section className="trail-project-workspace" aria-labelledby="trail-project-workspace-title">
        <div className="trail-project-workspace__header">
          <div>
            <p className="trail-app__eyebrow">Project</p>
            <h2 id="trail-project-workspace-title">{project.title}</h2>
            <span>{projectStatus?.name ?? "Invalid status"}</span>
          </div>
          <div>
            <button
              disabled={actionsDisabled}
              onClick={() => setDetailsOpen(true)}
              type="button"
            >
              Edit details
            </button>
            {pending ? <span className="trail-pending-chip">Saving</span> : null}
          </div>
        </div>

        <TrailProjectPropertiesDialog
          actions={props.actions.projects}
          configuration={props.configuration}
          onError={props.onError}
          onOpenChange={setDetailsOpen}
          open={detailsOpen}
          projectId={project.id}
          runtimeStore={props.runtimeStore}
          writable={props.writable}
        />

        <label className="trail-issue-editor__field">
          <span>Initiative</span>
          <select
            aria-label={`Initiative for ${project.title}`}
            disabled={actionsDisabled}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => requestInitiative(event.target.value)}
            value={project.initiativeId ?? ""}
          >
            <option value="">No Initiative</option>
            {initiativeIds.map((initiativeId) => (
              <TrailInitiativeOption
                initiativeId={initiativeId}
                key={initiativeId}
                runtimeStore={props.runtimeStore}
              />
            ))}
          </select>
        </label>

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

        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h3>Milestones</h3>
            <p>Use checkpoints to organize current Project work without adding another workflow Status.</p>
          </div>
          <span className="trail-count" aria-label={`${milestoneIds.length} milestones`}>
            {milestoneIds.length}
          </span>
        </div>

        <form className="trail-capture__form" onSubmit={submitMilestone}>
          <label className="trail-capture__field">
            <span className="screen-reader-text">Milestone title</span>
            <input
              autoComplete="off"
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setMilestoneDraft(event.target.value)}
              placeholder="Add a Project Milestone"
              value={milestoneDraft}
            />
          </label>
          <label className="trail-capture__field">
            <span className="screen-reader-text">Milestone due</span>
            <input
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setMilestoneDueDraft(event.target.value)}
              type="datetime-local"
              value={milestoneDueDraft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={actionsDisabled || milestoneDraft.trim() === ""}
            type="submit"
          >
            Add Milestone
          </button>
        </form>

        {milestoneIds.length === 0 ? (
          <div className="trail-empty-state trail-empty-state--compact">
            <p>No Milestones yet.</p>
            <span>Add a checkpoint when the Project needs an intermediate outcome.</span>
          </div>
        ) : (
          <ol className="trail-workflow-issue-list" aria-label={`Milestones in ${project.title}`}>
            {milestoneIds.map((milestoneId) => (
              <TrailMilestoneRow
                actions={props.actions.milestones}
                key={milestoneId}
                milestoneId={milestoneId}
                onError={props.onError}
                runtimeStore={props.runtimeStore}
                sourceIsHealthy={sourceIsHealthy}
                timezone={props.configuration.temporal.timezone}
                writable={props.writable}
              />
            ))}
          </ol>
        )}

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
            <p>Use List for explicit properties or Board to execute by Status.</p>
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
          <TrailWorkflowPresentation
            actions={props.actions.issues}
            configuration={props.configuration}
            issueIds={issueIds}
            laneMode="single"
            onError={props.onError}
            runtimeStore={props.runtimeStore}
            writable={props.writable && sourceIsHealthy}
          />
        )}
      </section>
    </>
  );
}
