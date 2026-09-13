import { useState } from "react";

import type { TrailEstimate, TrailPriority } from "../../domain/model/trail-values";
import { TrailEstimatePropertySelect } from "../entities/trail-estimate-property-select";
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

type ComposerKind = "initiative" | "issue" | "project" | "triage";

const SPECIMENS = {
  initiative: {
    context: "Initiative",
    description: "",
    title: "Improve Trail onboarding",
  },
  issue: {
    context: "Issue",
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

function ComposerContextAccessory({ kind }: { readonly kind: ComposerKind }) {
  if (kind === "issue") {
    return (
      <TrailStandardComposerRelation label="Project" required>
        <TrailPropertyControl aria-label="Project: Standalone">Standalone</TrailPropertyControl>
      </TrailStandardComposerRelation>
    );
  }

  if (kind === "project") {
    return (
      <TrailStandardComposerRelation label="Initiative">
        <TrailPropertyControl aria-label="Initiative: No initiative">No initiative</TrailPropertyControl>
      </TrailStandardComposerRelation>
    );
  }

  return null;
}

function ComposerPreview({ kind }: { readonly kind: ComposerKind }) {
  const [priority, setPriority] = useState<TrailPriority | undefined>("medium");
  const [estimate, setEstimate] = useState<TrailEstimate | undefined>("medium");
  const specimen = SPECIMENS[kind];

  return (
    <section aria-label={`${kind} composer preview`} className="trail-standard-composer-preview">
      <TrailComposerSurface
        canSubmit
        context={specimen.context}
        contextAccessory={kind === "triage" || kind === "initiative"
          ? undefined
          : <ComposerContextAccessory kind={kind} />}
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
            {kind === "initiative" ? null : (
              <TrailTextarea
                aria-label={`${specimen.context} calibration description`}
                defaultValue={specimen.description}
                readOnly
                rows={3}
              />
            )}
          </TrailStandardComposerEditor>

          {kind === "initiative" ? null : (
            <TrailStandardComposerProperties label={`${specimen.context} properties`}>
              <TrailPriorityPropertySelect
                layer="modal-child"
                onValueChange={setPriority}
                value={priority}
              />
              <FixedProperty label="Labels" />
              {kind === "issue" ? <FixedProperty label="Milestone" /> : null}
              {kind === "issue" ? (
                <TrailEstimatePropertySelect
                  layer="modal-child"
                  onValueChange={setEstimate}
                  value={estimate}
                />
              ) : null}
              <FixedProperty label={kind === "triage" ? "Review Sep 12" : "Due"} />
            </TrailStandardComposerProperties>
          )}
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
      <ComposerPreview kind="initiative" />
    </div>
  );
}
