import { useState } from "react";

import type { TrailPriority } from "../../domain/model/trail-values";
import { TrailPriorityPropertySelect } from "../entities/trail-priority-property-select";
import { TrailComposerSurface } from "../patterns/trail-composer";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import {
  TrailStandardComposerEditor,
  TrailStandardComposerForm,
  TrailStandardComposerProperties,
  TrailStandardComposerRelation,
} from "../patterns/trail-standard-composer-form";
import { TrailInput } from "../primitives/trail-input";
import { TrailTextarea } from "../primitives/trail-textarea";

type ComposerKind = "issue" | "project" | "triage";

const SPECIMENS = {
  issue: {
    context: "Issue · Standalone",
    description: "Follow up on the captured request and turn it into planned work.",
    title: "Polish the creation flow",
  },
  project: {
    context: "Project",
    description: "A focused project for finishing the Trail creation experience.",
    title: "Creation experience",
  },
  triage: {
    context: "Triage",
    description: "Capture the thought now and review it when the queue is ready.",
    title: "Review the new onboarding idea",
  },
} as const;

function FixedProperty({
  label,
}: {
  readonly label: string;
}) {
  return (
    <TrailPropertyControl aria-label={`${label} specimen`}>
      {label}
    </TrailPropertyControl>
  );
}

function ComposerPreview({ kind }: { readonly kind: ComposerKind }) {
  const [priority, setPriority] = useState<TrailPriority | undefined>("medium");
  const specimen = SPECIMENS[kind];

  return (
    <section aria-label={`${kind} composer preview`} className="trail-standard-composer-preview">
      <TrailComposerSurface
        canSubmit
        context={specimen.context}
        onDismiss={() => { /* visual calibration only */ }}
        onSubmit={() => { /* visual calibration only */ }}
        submitLabel="Create"
      >
        <TrailStandardComposerForm>
          <TrailStandardComposerEditor>
            <TrailInput
              aria-label={`${specimen.context} calibration title`}
              defaultValue={specimen.title}
              readOnly
            />
            <TrailTextarea
              aria-label={`${specimen.context} calibration description`}
              defaultValue={specimen.description}
              readOnly
              rows={3}
            />
          </TrailStandardComposerEditor>

          {kind === "issue" ? (
            <TrailStandardComposerRelation label="Project" required>
              <TrailPropertyControl aria-label="Project: Standalone">Standalone</TrailPropertyControl>
            </TrailStandardComposerRelation>
          ) : null}

          {kind === "project" ? (
            <TrailStandardComposerRelation label="Initiative">
              <TrailPropertyControl aria-label="Initiative: No initiative">No initiative</TrailPropertyControl>
            </TrailStandardComposerRelation>
          ) : null}

          <TrailStandardComposerProperties label={`${specimen.context} properties`}>
            <TrailPriorityPropertySelect
              onValueChange={setPriority}
              value={priority}
            />
            <FixedProperty label="Labels" />
            {kind === "issue" ? <FixedProperty label="Milestone" /> : null}
            {kind === "issue" ? <FixedProperty label="Estimate" /> : null}
            <FixedProperty label={kind === "triage" ? "Review · Sep 12" : "Due"} />
          </TrailStandardComposerProperties>
        </TrailStandardComposerForm>
      </TrailComposerSurface>
    </section>
  );
}

export function TrailStandardComposerFamilySpecimen() {
  return (
    <div className="trail-lab-grid">
      <ComposerPreview kind="triage" />
      <ComposerPreview kind="issue" />
      <ComposerPreview kind="project" />
    </div>
  );
}
