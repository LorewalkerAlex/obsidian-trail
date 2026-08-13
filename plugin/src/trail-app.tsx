import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import {
  STATUS_CATEGORIES,
  resolveStatusDefinition,
  type TrailConfiguration,
} from "./domain/trail-configuration";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "./domain/trail-issue";
import type { TrailProject } from "./domain/trail-project";
import {
  selectEffectiveProjectById,
  selectEffectiveProjectIds,
  selectEffectiveTriageIssueById,
  selectEffectiveTriageIssueIds,
  selectEffectiveWorkflowIssueById,
  selectEffectiveWorkflowIssueIdsByProject,
  selectIsTriageIssuePending,
  selectIsWorkflowEntityPending,
  selectSourceIssuesForPath,
  type TrailRuntimeStore,
} from "./domain/trail-runtime";
import { formatLocalDateTimeInTimeZone } from "./domain/trail-temporal";
import type { TriageCaptureReceipt } from "./domain/trail-triage-intake";
import type { TriageManagementReceipt } from "./domain/trail-triage-management";
import {
  WorkflowNeedsInputError,
  type WorkflowEntryReceipt,
} from "./domain/trail-workflow-entry";

export interface TrailAppProps {
  readonly onCapture: (title: string) => TriageCaptureReceipt;
  readonly onCreateProject: (title: string) => WorkflowEntryReceipt;
  readonly onCreateWorkflowIssue: (
    projectId: string,
    title: string,
  ) => WorkflowEntryReceipt;
  readonly onDefer: (expectedIssue: TrailTriageIssue) => TriageManagementReceipt;
  readonly onDelete: (expectedIssue: TrailTriageIssue) => TriageManagementReceipt;
  readonly onEdit: (
    expectedIssue: TrailTriageIssue,
    title: string,
    dueLocalValue: string,
  ) => TriageManagementReceipt;
  readonly onWorkflowStatusChange: (
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ) => WorkflowEntryReceipt;
  readonly runtimeStore: TrailRuntimeStore;
}

type TrailPage = "projects" | "triage";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Trail error.";
}

function formatDue(due: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(due));
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

export function TrailApp({
  onCapture,
  onCreateProject,
  onCreateWorkflowIssue,
  onDefer,
  onDelete,
  onEdit,
  onWorkflowStatusChange,
  runtimeStore,
}: TrailAppProps) {
  const availability = useStore(
    runtimeStore,
    (state) => state.availability,
  );
  const [activePage, setActivePage] = useState<TrailPage>("triage");

  return (
    <div className="trail-app">
      <header className="trail-app__header">
        <div>
          <p className="trail-app__eyebrow">Trail</p>
          <h1 className="trail-app__title">
            {activePage === "triage" ? "Triage" : "Projects"}
          </h1>
        </div>
        <p className="trail-app__subtitle">
          {activePage === "triage"
            ? "Capture now. Decide what it becomes when you are ready."
            : "Turn planned outcomes into executable Workflow Issues."}
        </p>
      </header>

      {availability.kind === "ready" ? (
        <nav className="trail-page-nav" aria-label="Trail pages">
          <button
            aria-current={activePage === "triage" ? "page" : undefined}
            className={activePage === "triage" ? "is-active" : undefined}
            onClick={() => setActivePage("triage")}
            type="button"
          >
            Triage
          </button>
          <button
            aria-current={activePage === "projects" ? "page" : undefined}
            className={activePage === "projects" ? "is-active" : undefined}
            onClick={() => setActivePage("projects")}
            type="button"
          >
            Projects
          </button>
        </nav>
      ) : null}

      {availability.kind === "idle" || availability.kind === "initializing" ? (
        <StatusPanel
          title="Loading Trail"
          message="Validating the Formal workspace and rebuilding runtime state."
        />
      ) : null}

      {availability.kind === "blocked" ? (
        <StatusPanel
          title="Trail needs attention"
          message={availability.message}
          tone="warning"
        />
      ) : null}

      {availability.kind === "error" ? (
        <StatusPanel
          title="Trail could not start"
          message={availability.message}
          tone="error"
        />
      ) : null}

      {availability.kind === "ready" && activePage === "triage" ? (
        <TriagePage
          onCapture={onCapture}
          onDefer={onDefer}
          onDelete={onDelete}
          onEdit={onEdit}
          runtimeStore={runtimeStore}
          timezone={availability.timezone}
        />
      ) : null}

      {availability.kind === "ready" && activePage === "projects" ? (
        <ProjectsPage
          onCreateProject={onCreateProject}
          onCreateWorkflowIssue={onCreateWorkflowIssue}
          onWorkflowStatusChange={onWorkflowStatusChange}
          runtimeStore={runtimeStore}
        />
      ) : null}
    </div>
  );
}

interface StatusPanelProps {
  readonly message: string;
  readonly title: string;
  readonly tone?: "error" | "warning";
}

function StatusPanel({
  message,
  title,
  tone,
}: StatusPanelProps) {
  const className = tone === undefined
    ? "trail-status-panel"
    : `trail-status-panel trail-status-panel--${tone}`;

  return (
    <section className={className} role={tone === "error" ? "alert" : "status"}>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

interface TriagePageProps {
  readonly onCapture: TrailAppProps["onCapture"];
  readonly onDefer: TrailAppProps["onDefer"];
  readonly onDelete: TrailAppProps["onDelete"];
  readonly onEdit: TrailAppProps["onEdit"];
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
}

function TriagePage({
  onCapture,
  onDefer,
  onDelete,
  onEdit,
  runtimeStore,
  timezone,
}: TriagePageProps) {
  const sourceIssues = useStore(
    runtimeStore,
    (state) => selectSourceIssuesForPath(state, "Trail/Collections/Triage.md"),
  );
  const issueIds = useStore(
    runtimeStore,
    useShallow(selectEffectiveTriageIssueIds),
  );
  const [draft, setDraft] = useState("");
  const [captureError, setCaptureError] = useState<string>();
  const [managementError, setManagementError] = useState<string>();
  const sourceIsValid = sourceIssues.length === 0;

  const submitCapture = (
    event: SyntheticEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    if (!sourceIsValid || draft.trim() === "") {
      return;
    }

    try {
      const receipt = onCapture(draft);
      setDraft("");
      setCaptureError(undefined);

      void receipt.completion.catch((error: unknown) => {
        setCaptureError(errorMessage(error));
      });
    } catch (error: unknown) {
      setCaptureError(errorMessage(error));
    }
  };

  const runManagementAction = (
    action: () => TriageManagementReceipt,
  ): boolean => {
    try {
      const receipt = action();
      setManagementError(undefined);
      void receipt.completion.catch((error: unknown) => {
        setManagementError(errorMessage(error));
      });
      return true;
    } catch (error: unknown) {
      setManagementError(errorMessage(error));
      return false;
    }
  };

  return (
    <main className="trail-triage">
      <section className="trail-capture" aria-labelledby="trail-capture-title">
        <div className="trail-section-heading">
          <div>
            <h2 id="trail-capture-title">Quick Capture</h2>
            <p>New captures return to you in seven calendar days by default.</p>
          </div>
        </div>

        <form className="trail-capture__form" onSubmit={submitCapture}>
          <label className="trail-capture__field">
            <span className="screen-reader-text">Capture title</span>
            <input
              autoComplete="off"
              disabled={!sourceIsValid}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDraft(event.target.value);
              }}
              placeholder="What needs your attention?"
              value={draft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={!sourceIsValid || draft.trim() === ""}
            type="submit"
          >
            Capture
          </button>
        </form>

        {captureError !== undefined ? (
          <p className="trail-inline-error" role="alert">
            {captureError}
          </p>
        ) : null}
      </section>

      {sourceIssues.length > 0 ? (
        <DataIssuePanel
          issues={sourceIssues.map((issue) => issue.message)}
          message="Trail is showing the last known good state and has paused Triage actions until the Markdown becomes valid again."
          title="Triage.md has a data issue."
        />
      ) : null}

      {managementError !== undefined ? (
        <p className="trail-inline-error trail-management-error" role="alert">
          {managementError}
        </p>
      ) : null}

      <section className="trail-triage-list" aria-labelledby="trail-list-title">
        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h2 id="trail-list-title">Captured</h2>
            <p>Due-first, then stable identity.</p>
          </div>
          <span className="trail-count" aria-label={`${issueIds.length} captured issues`}>
            {issueIds.length}
          </span>
        </div>

        {issueIds.length === 0 ? (
          <div className="trail-empty-state">
            <p>Nothing is waiting in Triage.</p>
            <span>Your next capture will appear here immediately.</span>
          </div>
        ) : (
          <ol className="trail-issue-list">
            {issueIds.map((issueId) => (
              <TriageIssueRow
                issueId={issueId}
                key={issueId}
                onDefer={(issue) => runManagementAction(() => onDefer(issue))}
                onDelete={(issue) => runManagementAction(() => onDelete(issue))}
                onEdit={(issue, title, dueLocalValue) =>
                  runManagementAction(() => onEdit(issue, title, dueLocalValue))}
                runtimeStore={runtimeStore}
                sourceIsValid={sourceIsValid}
                timezone={timezone}
              />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

interface DataIssuePanelProps {
  readonly issues: readonly string[];
  readonly message: string;
  readonly title: string;
}

function DataIssuePanel({ issues, message, title }: DataIssuePanelProps) {
  return (
    <section className="trail-data-issue" role="alert">
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${index}:${issue}`}>{issue}</li>
        ))}
      </ul>
    </section>
  );
}

interface TriageIssueRowProps {
  readonly issueId: string;
  readonly onDefer: (issue: TrailTriageIssue) => boolean;
  readonly onDelete: (issue: TrailTriageIssue) => boolean;
  readonly onEdit: (
    issue: TrailTriageIssue,
    title: string,
    dueLocalValue: string,
  ) => boolean;
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceIsValid: boolean;
  readonly timezone: string;
}

function TriageIssueRow({
  issueId,
  onDefer,
  onDelete,
  onEdit,
  runtimeStore,
  sourceIsValid,
  timezone,
}: TriageIssueRowProps) {
  const issue = useStore(
    runtimeStore,
    (state) => selectEffectiveTriageIssueById(state, issueId),
  );
  const isPending = useStore(
    runtimeStore,
    (state) => selectIsTriageIssuePending(state, issueId),
  );
  const [editBaseline, setEditBaseline] = useState<TrailTriageIssue>();
  const [titleDraft, setTitleDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (issue === undefined) {
    return null;
  }

  const actionsDisabled = isPending || !sourceIsValid;
  const beginEdit = (): void => {
    setConfirmDelete(false);
    setEditBaseline(issue);
    setTitleDraft(issue.title);
    setDueDraft(formatLocalDateTimeInTimeZone(issue.due, timezone));
  };
  const cancelEdit = (): void => {
    setEditBaseline(undefined);
  };
  const submitEdit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      editBaseline === undefined
      || actionsDisabled
      || titleDraft.trim() === ""
      || dueDraft === ""
    ) {
      return;
    }
    if (onEdit(editBaseline, titleDraft, dueDraft)) {
      setEditBaseline(undefined);
    }
  };

  return (
    <li
      className="trail-issue-row"
      data-pending={isPending ? "true" : undefined}
    >
      {editBaseline === undefined ? (
        <>
          <div className="trail-issue-row__body">
            <strong>{issue.title}</strong>
            <span>Due {formatDue(issue.due, timezone)}</span>
          </div>
          <div className="trail-issue-row__actions">
            <button disabled={actionsDisabled} onClick={beginEdit} type="button">
              Edit
            </button>
            <button
              disabled={actionsDisabled}
              onClick={() => {
                setConfirmDelete(false);
                onDefer(issue);
              }}
              type="button"
            >
              Defer 7 days
            </button>
            {confirmDelete ? (
              <span className="trail-delete-confirmation">
                <button
                  className="mod-warning"
                  disabled={actionsDisabled}
                  onClick={() => {
                    if (onDelete(issue)) setConfirmDelete(false);
                  }}
                  type="button"
                >
                  Confirm delete
                </button>
                <button onClick={() => setConfirmDelete(false)} type="button">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                disabled={actionsDisabled}
                onClick={() => setConfirmDelete(true)}
                type="button"
              >
                Delete
              </button>
            )}
          </div>
        </>
      ) : (
        <form className="trail-issue-editor" onSubmit={submitEdit}>
          <label>
            <span>Title</span>
            <input
              autoComplete="off"
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setTitleDraft(event.target.value);
              }}
              value={titleDraft}
            />
          </label>
          <label>
            <span>Due ({timezone})</span>
            <input
              disabled={actionsDisabled}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDueDraft(event.target.value);
              }}
              type="datetime-local"
              value={dueDraft}
            />
          </label>
          <div className="trail-issue-editor__actions">
            <button
              className="mod-cta"
              disabled={actionsDisabled || titleDraft.trim() === "" || dueDraft === ""}
              type="submit"
            >
              Save
            </button>
            <button onClick={cancelEdit} type="button">
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

interface ProjectsPageProps {
  readonly onCreateProject: TrailAppProps["onCreateProject"];
  readonly onCreateWorkflowIssue: TrailAppProps["onCreateWorkflowIssue"];
  readonly onWorkflowStatusChange: TrailAppProps["onWorkflowStatusChange"];
  readonly runtimeStore: TrailRuntimeStore;
}

function ProjectsPage({
  onCreateProject,
  onCreateWorkflowIssue,
  onWorkflowStatusChange,
  runtimeStore,
}: ProjectsPageProps) {
  const projectIds = useStore(runtimeStore, useShallow(selectEffectiveProjectIds));
  const configuration = useStore(
    runtimeStore,
    (state) => state.committed.configuration,
  );
  const workflowSourceIssues = useStore(
    runtimeStore,
    useShallow((state) => state.committed.sourceIssues.filter((issue) => (
      issue.filePath === "Trail/Projects"
      || issue.filePath.startsWith("Trail/Projects/")
    ))),
  );
  const workflowRootIsValid = useStore(
    runtimeStore,
    (state) => selectSourceIssuesForPath(state, "Trail/Projects").length === 0,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [projectDraft, setProjectDraft] = useState("");
  const [workflowError, setWorkflowError] = useState<string>();
  const effectiveSelectedProjectId = selectedProjectId !== undefined
    && projectIds.includes(selectedProjectId)
      ? selectedProjectId
      : projectIds[0];

  const submitProject = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (projectDraft.trim() === "") return;
    try {
      const receipt = onCreateProject(projectDraft);
      setProjectDraft("");
      setSelectedProjectId(receipt.entityId);
      setWorkflowError(undefined);
      void receipt.completion.catch((error: unknown) => {
        setWorkflowError(errorMessage(error));
      });
    } catch (error: unknown) {
      setWorkflowError(errorMessage(error));
    }
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
        <DataIssuePanel
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
  readonly onCreateWorkflowIssue: TrailAppProps["onCreateWorkflowIssue"];
  readonly onError: (message: string | undefined) => void;
  readonly onWorkflowStatusChange: TrailAppProps["onWorkflowStatusChange"];
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
  const sourcePath = useStore(
    runtimeStore,
    (state) => state.committed.sourceByEntityId[projectId],
  );
  const sourceIssues = useStore(
    runtimeStore,
    (state) => selectSourceIssuesForPath(state, sourcePath),
  );
  const workflowRootIsValid = useStore(
    runtimeStore,
    (state) => selectSourceIssuesForPath(state, "Trail/Projects").length === 0,
  );
  const [issueDraft, setIssueDraft] = useState("");

  if (project === undefined || configuration === null) return null;
  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    project.statusDefinitionId,
  );
  const sourceIsValid = workflowRootIsValid && sourceIssues.length === 0;

  const submitIssue = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!sourceIsValid || issueDraft.trim() === "") return;
    try {
      const receipt = onCreateWorkflowIssue(project.id, issueDraft);
      setIssueDraft("");
      onError(undefined);
      void receipt.completion.catch((error: unknown) => {
        onError(errorMessage(error));
      });
    } catch (error: unknown) {
      onError(errorMessage(error));
    }
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
        <DataIssuePanel
          issues={sourceIssues.map((issue) => issue.message)}
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
  readonly onStatusChange: TrailAppProps["onWorkflowStatusChange"];
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
    onError(undefined);
    void receipt.completion.catch((error: unknown) => {
      onError(errorMessage(error));
    });
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
      onError(errorMessage(error));
    }
  };

  const submitEstimate = (event: FormEvent<HTMLFormElement>): void => {
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
    try {
      observeReceipt(onStatusChange(
        completionBaseline,
        completionTargetId,
        estimate,
      ));
      setCompletionBaseline(undefined);
      setCompletionTargetId(undefined);
      setEstimateDraft("");
    } catch (error: unknown) {
      onError(errorMessage(error));
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
