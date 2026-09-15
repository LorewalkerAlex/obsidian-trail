import {
  useState,
  type MouseEventHandler,
} from "react";
import { useStore } from "zustand";

import { selectTrailHomeReadModel } from "../../../query/home/trail-home-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import {
  TrailInitiativeComposer,
  TrailProjectComposer,
  TrailTriageComposer,
  TrailWorkflowIssueComposer,
} from "../../entities/trail-standard-creation-composers";
import type { TrailActionMenuItem } from "../../interactions/trail-action-menu";
import { useTrailActionMenuPresenter } from "../../interactions/trail-action-menu-context";
import { TrailPageHeader } from "../../patterns/trail-page-header";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import { TrailIconButton } from "../../primitives/trail-icon-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleStart } from "../cycles/trail-cycle-start";
import { TrailLifecycleWidget } from "./trail-lifecycle-widget";
import { TrailThisWeekWidget } from "./trail-this-week-widget";
import { TrailWeeklyMeetingNotesWidget } from "./trail-weekly-meeting-notes-widget";
import { TrailWorkPulseWidget } from "./trail-work-pulse-widget";
import { TrailWorkTrendWidget } from "./trail-work-trend-widget";

type TrailHomeCreationKind = "triage" | "issue" | "project" | "initiative";

const HOME_CREATION_MENU_ITEMS: readonly TrailActionMenuItem<TrailHomeCreationKind>[] = [
  { group: "creation", id: "triage", label: "Triage", targets: [] },
  { group: "creation", id: "issue", label: "Issue", targets: [] },
  { group: "creation", id: "project", label: "Project", targets: [] },
  { group: "creation", id: "initiative", label: "Initiative", targets: [] },
];

type TrailHomePageActions = {
  readonly cycles: Pick<TrailUiActions["cycles"], "start">;
  readonly initiatives: Pick<TrailUiActions["initiatives"], "create">;
  readonly issues: Pick<TrailUiActions["issues"], "createFromDraft">;
  readonly projects: Pick<TrailUiActions["projects"], "createFromDraft">;
  readonly triage: Pick<TrailUiActions["triage"], "create">;
  readonly weeklyNote: TrailUiActions["weeklyNote"];
};

interface TrailHomeCreationSession {
  readonly kind: TrailHomeCreationKind;
  readonly referenceTimestamp: number;
}

function TrailAddIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="100%"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={1.4}
      viewBox="0 0 16 16"
      width="100%"
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function TrailHomePage({
  actions,
  onCycleActivate,
  onProjectActivate,
  onProjectsActivate,
  onTriageActivate,
  renderMarkdown,
  runtimeStore,
}: {
  readonly actions: TrailHomePageActions;
  readonly onCycleActivate: (cycleId: string) => void;
  readonly onProjectActivate: (projectId: string) => void;
  readonly onProjectsActivate: () => void;
  readonly onTriageActivate: () => void;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const actionMenu = useTrailActionMenuPresenter();
  const [creationSession, setCreationSession] = useState<TrailHomeCreationSession | null>(null);
  const [startCycleOpen, setStartCycleOpen] = useState(false);
  const readModel = selectTrailHomeReadModel(state, Date.now());
  const writable = readModel !== null && state.control.kind === "ready";
  const creationAvailable = writable && actionMenu !== null;

  const openCreationMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (!creationAvailable || actionMenu === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    actionMenu.showAtPosition({ x: bounds.right, y: bounds.bottom }, {
      items: HOME_CREATION_MENU_ITEMS,
      onSelect: (kind) => {
        setCreationSession({ kind, referenceTimestamp: Date.now() });
      },
    });
  };

  const closeCreation = (open: boolean) => {
    if (!open) setCreationSession(null);
  };

  return (
    <div className="trail-home-page">
      <TrailPageHeader
        actions={(
          <TrailIconButton
            disabled={!creationAvailable}
            icon={<TrailAddIcon />}
            label="Create"
            onClick={openCreationMenu}
            title="Create"
          />
        )}
        title="Home"
      />

      {readModel === null ? null : (
        <div className="trail-home-page__widgets">
          <div className="trail-home-page__slot" data-home-slot="this-week">
            <TrailThisWeekWidget
              days={readModel.thisWeek.days}
              monthLabel={readModel.thisWeek.monthLabel}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="work-pulse">
            <TrailWorkPulseWidget
              currentCycle={readModel.workPulse.currentCycle}
              onCurrentCycleActivate={onCycleActivate}
              onProjectActivate={onProjectActivate}
              onProjectsActivate={onProjectsActivate}
              onStartCycle={() => setStartCycleOpen(true)}
              onTriageActivate={onTriageActivate}
              projects={readModel.workPulse.inProgressProjects}
              timezone={readModel.workPulse.timezone}
              triage={readModel.workPulse.triage}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="lifecycle">
            <TrailLifecycleWidget
              days={readModel.lifecycle.days}
              months={readModel.lifecycle.months}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="work-trend">
            <TrailWorkTrendWidget
              days={readModel.workTrend.days}
              hasHistory={readModel.workTrend.hasHistory}
              rangeLabel={readModel.workTrend.rangeLabel}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="weekly-notes">
            <TrailWeeklyMeetingNotesWidget
              actions={actions.weeklyNote}
              renderMarkdown={renderMarkdown}
            />
          </div>
        </div>
      )}

      {!startCycleOpen ? null : (
        <TrailCycleStart
          actions={actions.cycles}
          onDismiss={() => setStartCycleOpen(false)}
          onStarted={(cycleId) => {
            setStartCycleOpen(false);
            onCycleActivate(cycleId);
          }}
          runtimeStore={runtimeStore}
        />
      )}

      {creationSession?.kind !== "triage" || readModel === null ? null : (
        <TrailTriageComposer
          configuration={readModel.creation.configuration}
          defaultDue={readModel.creation.triage.defaultDue}
          onCreate={async (input) => {
            const receipt = actions.triage.create(input);
            await receipt.completion;
          }}
          onOpenChange={closeCreation}
          open
        />
      )}

      {creationSession?.kind !== "issue" || readModel === null ? null : (
        <TrailWorkflowIssueComposer
          configuration={readModel.creation.configuration}
          initialProjectId={readModel.creation.issue.defaultProjectId}
          onCreate={async (input) => {
            const receipt = actions.issues.createFromDraft(input);
            await receipt.completion;
          }}
          onOpenChange={closeCreation}
          open
          projects={readModel.creation.issue.projects}
          referenceTimestamp={creationSession.referenceTimestamp}
          seedTitle=""
        />
      )}

      {creationSession?.kind !== "project" || readModel === null ? null : (
        <TrailProjectComposer
          configuration={readModel.creation.configuration}
          initiatives={readModel.creation.project.initiatives}
          onCreate={async (input) => {
            const receipt = actions.projects.createFromDraft(input);
            await receipt.completion;
          }}
          onOpenChange={closeCreation}
          open
          referenceTimestamp={creationSession.referenceTimestamp}
          seedTitle=""
        />
      )}

      {creationSession?.kind !== "initiative" ? null : (
        <TrailInitiativeComposer
          onCreate={async (title) => {
            const receipt = actions.initiatives.create(title);
            await receipt.completion;
          }}
          onOpenChange={closeCreation}
          open
        />
      )}
    </div>
  );
}
