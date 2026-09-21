import { formatTrailCycleLabel } from "../../../domain/rules/trail-cycle-label";
import type { TrailProgressReadModel } from "../../../query/shared/trail-progress-query";
import { TrailSegmentedSummary } from "../../patterns/trail-segmented-summary";
import { TrailButton } from "../../primitives/trail-button";
import { TrailProgress } from "../../primitives/trail-progress";
import { TrailHomeWidgetFrame } from "./trail-home-widget-frame";

export interface TrailWorkPulseProject {
  readonly id: string;
  readonly progress: TrailProgressReadModel;
  readonly title: string;
}

export interface TrailWorkPulseCurrentCycle {
  readonly id: string;
  readonly plannedEnd: number;
  readonly progress: TrailProgressReadModel;
  readonly startedAt: number;
}

const VISIBLE_PROJECT_LIMIT = 3;

function progressLabel(progress: TrailProgressReadModel): string {
  if (progress.unavailable === true) return "—";
  return `${Math.round((progress.value / progress.max) * 100)}%`;
}

function progressCount(progress: TrailProgressReadModel): string {
  if (progress.unavailable === true) return "No scoped issues";
  return `${progress.value} / ${progress.max} done`;
}

function ProgressBar({
  density,
  label,
  progress,
}: {
  readonly density: "compact" | "micro";
  readonly label: string;
  readonly progress: TrailProgressReadModel;
}) {
  return progress.unavailable === true ? (
    <TrailProgress density={density} label={label} unavailable />
  ) : (
    <TrailProgress
      density={density}
      label={label}
      max={progress.max}
      value={progress.value}
    />
  );
}

export function TrailWorkPulseWidget({
  currentCycle,
  onCurrentCycleActivate,
  onProjectActivate,
  onProjectsActivate,
  onStartCycle,
  onTriageActivate,
  projects,
  timezone,
  triage,
}: {
  readonly currentCycle?: TrailWorkPulseCurrentCycle;
  readonly onCurrentCycleActivate: (cycleId: string) => void;
  readonly onProjectActivate: (projectId: string) => void;
  readonly onProjectsActivate: () => void;
  readonly onStartCycle: () => void;
  readonly onTriageActivate: () => void;
  readonly projects: readonly TrailWorkPulseProject[];
  readonly timezone: string;
  readonly triage: {
    readonly activeCount: number;
    readonly overdueCount: number;
    readonly remainCount: number;
  };
}) {
  const visibleProjects = projects.slice(0, VISIBLE_PROJECT_LIMIT);
  const hiddenProjectCount = Math.max(0, projects.length - visibleProjects.length);

  return (
    <TrailHomeWidgetFrame size="banner" title="Work pulse">
      <div className="trail-home-work-pulse">
        <section className="trail-home-work-pulse__module" aria-label="Current cycle pulse">
          {currentCycle === undefined ? (
            <div className="trail-home-work-pulse__module-static trail-home-work-pulse__module-static--cycle">
              <div className="trail-home-work-pulse__module-title">Current cycle</div>
              <div className="trail-home-work-pulse__cycle-empty">
                <span>No current cycle</span>
                <TrailButton onClick={onStartCycle}>Start cycle</TrailButton>
              </div>
            </div>
          ) : (
            <button
              aria-label="Open current cycle"
              className="trail-home-work-pulse__module-route trail-home-work-pulse__module-route--cycle"
              onClick={() => onCurrentCycleActivate(currentCycle.id)}
              type="button"
            >
              <span className="trail-home-work-pulse__module-title">Current cycle</span>
              <span className="trail-home-work-pulse__cycle-summary">
                <span>{formatTrailCycleLabel(currentCycle, timezone)}</span>
                <span>{progressCount(currentCycle.progress)}</span>
              </span>
              <ProgressBar
                density="compact"
                label="Current cycle progress"
                progress={currentCycle.progress}
              />
            </button>
          )}
        </section>

        <section className="trail-home-work-pulse__module" aria-label="Triage pulse">
          <button
            aria-label="Open Triage"
            className="trail-home-work-pulse__module-route trail-home-work-pulse__module-route--triage"
            onClick={onTriageActivate}
            type="button"
          >
            <span className="trail-home-work-pulse__module-title">Triage</span>
            {triage.activeCount === 0 ? (
              <span className="trail-home-work-pulse__zero-route">0 active</span>
            ) : (
              <TrailSegmentedSummary
                appearance="inline"
                label="Triage pressure"
                segments={[
                  {
                    id: "overdue",
                    label: "overdue",
                    tone: "attention",
                    value: triage.overdueCount,
                  },
                  {
                    id: "remain",
                    label: "remain",
                    value: triage.remainCount,
                  },
                ]}
              />
            )}
          </button>
        </section>

        <section className="trail-home-work-pulse__module" aria-label="In progress projects pulse">
          <div className="trail-home-work-pulse__module-static trail-home-work-pulse__module-static--projects">
            <button
              aria-label="Open Projects"
              className="trail-home-work-pulse__module-title trail-home-work-pulse__module-title--route"
              onClick={onProjectsActivate}
              type="button"
            >
              In progress projects
            </button>
            {visibleProjects.length === 0 ? (
              <span className="trail-home-work-pulse__projects-empty">None started</span>
            ) : (
              <div className="trail-home-work-pulse__projects">
                {visibleProjects.map((project) => (
                  <button
                    aria-label={`Open ${project.title}`}
                    className="trail-home-work-pulse__project"
                    key={project.id}
                    onClick={() => onProjectActivate(project.id)}
                    type="button"
                  >
                    <span className="trail-home-work-pulse__project-title">{project.title}</span>
                    <ProgressBar
                      density="micro"
                      label={`${project.title} progress`}
                      progress={project.progress}
                    />
                    <span className="trail-home-work-pulse__project-value">
                      {progressLabel(project.progress)}
                    </span>
                  </button>
                ))}
                {hiddenProjectCount === 0 ? null : (
                  <button
                    className="trail-home-work-pulse__more"
                    onClick={onProjectsActivate}
                    type="button"
                  >
                    +{hiddenProjectCount} more
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </TrailHomeWidgetFrame>
  );
}
