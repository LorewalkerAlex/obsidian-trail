import { useState } from "react";

import type { TrailPriority } from "../../domain/model/trail-values";
import type {
  TrailTriageFilterPropertyId,
  TrailTriageOrdering,
} from "../../query/triage/trail-triage-query";
import { TrailDuePropertySelect } from "../entities/trail-due-property-select";
import { TrailLabelPropertySelect } from "../entities/trail-label-property-select";
import { TrailPriorityPropertySelect } from "../entities/trail-priority-property-select";
import { useTrailCollectionFilterState } from "../interactions/trail-collection-filter-state";
import {
  TrailTriageReviewSurface,
  type TrailTriageReviewDraft,
} from "../pages/triage/trail-triage-review-surface";
import { TrailTriageViewControls } from "../pages/triage/trail-triage-view-controls";
import {
  TRAIL_FOUNDATION_CONFIGURATION,
  TRAIL_FOUNDATION_REFERENCE_TIMESTAMP,
} from "./trail-foundation-fixtures";

export function TrailTriagePropertyFamilySpecimen() {
  const [priority, setPriority] = useState<TrailPriority | undefined>("high");
  const [labelIds, setLabelIds] = useState<readonly string[]>([
    "foundation-design",
    "foundation-onboarding",
  ]);
  const [due, setDue] = useState(TRAIL_FOUNDATION_REFERENCE_TIMESTAMP);

  return (
    <div className="trail-lab-property-panel">
      <div className="trail-lab-property-row">
        <span>Priority</span>
        <TrailPriorityPropertySelect onValueChange={setPriority} value={priority} />
      </div>
      <div className="trail-lab-property-row">
        <span>Labels</span>
        <TrailLabelPropertySelect
          groups={TRAIL_FOUNDATION_CONFIGURATION.labelGroups}
          labels={TRAIL_FOUNDATION_CONFIGURATION.labels}
          onValueChange={setLabelIds}
          value={labelIds}
        />
      </div>
      <div className="trail-lab-property-row">
        <span>Due</span>
        <TrailDuePropertySelect
          onValueChange={setDue}
          timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
          value={due}
        />
      </div>
    </div>
  );
}

export function TrailTriageViewControlsSpecimen() {
  const filters = useTrailCollectionFilterState<TrailTriageFilterPropertyId>();
  const [ordering, setOrdering] = useState<TrailTriageOrdering>("review-due");

  return (
    <TrailTriageViewControls
      configuration={TRAIL_FOUNDATION_CONFIGURATION}
      filter={filters.state}
      onClearAllFilters={filters.clearAll}
      onClearFilterClause={filters.clearClause}
      onOrderingChange={setOrdering}
      onSetDueFilter={filters.setDueValue}
      onToggleDiscreteFilter={filters.toggleDiscreteValue}
      ordering={ordering}
    />
  );
}

export function TrailTriageReviewSpecimen() {
  const [draft, setDraft] = useState<TrailTriageReviewDraft>({
    description: "Confirm the queue composition and creation flow before the next planning pass.",
    due: TRAIL_FOUNDATION_REFERENCE_TIMESTAMP,
    labelIds: ["foundation-design", "foundation-onboarding"],
    priority: "high",
    title: "Review the Trail creation experience",
  });

  return (
    <div className="trail-lab-list">
      <TrailTriageReviewSurface
        canNext
        canPrevious
        configuration={TRAIL_FOUNDATION_CONFIGURATION}
        draft={draft}
        onAccept={() => { /* visual calibration only */ }}
        onBack={() => { /* visual calibration only */ }}
        onCommitDraft={() => { /* visual calibration only */ }}
        onDefer={() => { /* visual calibration only */ }}
        onDelete={() => { /* visual calibration only */ }}
        onDescriptionChange={(description) => setDraft((current) => ({ ...current, description }))}
        onDueChange={(due) => setDraft((current) => ({ ...current, due }))}
        onLabelsChange={(labelIds) => setDraft((current) => ({ ...current, labelIds }))}
        onNext={() => { /* visual calibration only */ }}
        onPrevious={() => { /* visual calibration only */ }}
        onPriorityChange={(priority) => setDraft((current) => ({ ...current, priority }))}
        onTitleChange={(title) => setDraft((current) => ({ ...current, title }))}
        positionLabel="2 / 10"
      />
    </div>
  );
}
