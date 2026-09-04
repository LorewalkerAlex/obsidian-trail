import { useState } from "react";

import type { TrailPriority } from "../../domain/model/trail-values";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import { TrailPriorityPropertySelect } from "../entities/trail-priority-property-select";
import { TrailTriageRow } from "../entities/trail-triage-row";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import {
  TrailViewBar,
  TrailViewBarAction,
  TrailViewLayoutSwitch,
} from "../patterns/trail-view-bar";
import { TrailButton } from "../primitives/trail-button";
import { TrailCheckbox } from "../primitives/trail-checkbox";
import { TrailIconButton } from "../primitives/trail-icon-button";
import { TrailInput } from "../primitives/trail-input";
import { TrailProgress } from "../primitives/trail-progress";
import { TrailSeparator } from "../primitives/trail-separator";
import { TrailTextarea } from "../primitives/trail-textarea";
import {
  LabControlGroup,
  LabSection,
  LabSpecimenRow,
  LabStateGrid,
} from "./trail-lab-showroom";

interface TrailFoundationLabProps {
  readonly control: TrailRuntimeControl;
  readonly revision: number;
}

const FOUNDATION_SWATCHES = [
  { label: "Canvas", role: "Primary work surface", swatch: "canvas" },
  { label: "Sidebar", role: "Navigation surface", swatch: "sidebar" },
  { label: "Hover", role: "Quiet interaction state", swatch: "hover" },
  { label: "Accent", role: "Primary action and focus", swatch: "accent" },
] as const;

function runtimeLabel(control: TrailRuntimeControl): string {
  switch (control.kind) {
    case "loading": return "Loading";
    case "ready": return "Ready";
    case "refreshing": return "Refreshing";
    case "read-only-error": return "Read only";
  }
}

type CalibrationIconKind = "board" | "dots" | "filter" | "list" | "search" | "sliders";

function CalibrationIcon({ kind }: { readonly kind: CalibrationIconKind }) {
  if (kind === "list") {
    return (
      <svg aria-hidden="true" className="trail-lab-svg-icon" viewBox="0 0 24 24">
        <path d="M5 7h14M5 12h14M5 17h14" />
      </svg>
    );
  }

  if (kind === "board") {
    return (
      <svg aria-hidden="true" className="trail-lab-svg-icon" viewBox="0 0 24 24">
        <rect height="14" rx="1.5" width="4" x="4" y="5" />
        <rect height="14" rx="1.5" width="4" x="10" y="5" />
        <rect height="14" rx="1.5" width="4" x="16" y="5" />
      </svg>
    );
  }

  return <span aria-hidden="true" className={`trail-lab-icon trail-lab-icon--${kind}`} />;
}

function TokenRolesSpecimen() {
  return (
    <div className="trail-lab-swatches">
      {FOUNDATION_SWATCHES.map((color) => (
        <div className="trail-lab-swatch" key={color.swatch}>
          <span
            aria-hidden="true"
            className={`trail-lab-swatch__color trail-lab-swatch__color--${color.swatch}`}
          />
          <span className="trail-lab-swatch__meta">
            <strong>{color.label}</strong>
            <span>{color.role}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function TypeHierarchySpecimen() {
  return (
    <div className="trail-lab-type-stack">
      <div className="trail-lab-type-row">
        <span className="trail-lab-type-row__label">Page</span>
        <span className="trail-lab-type-page">Interface foundation</span>
      </div>
      <div className="trail-lab-type-row">
        <span className="trail-lab-type-row__label">Section</span>
        <span className="trail-lab-type-section">Current cycle</span>
      </div>
      <div className="trail-lab-type-row">
        <span className="trail-lab-type-row__label">Body</span>
        <span className="trail-lab-type-body">Keep the primary task in focus.</span>
      </div>
      <div className="trail-lab-type-row">
        <span className="trail-lab-type-row__label">Muted</span>
        <span className="trail-lab-type-muted">Updated 3 min ago</span>
      </div>
      <div className="trail-lab-type-row">
        <span className="trail-lab-type-row__label">Meta</span>
        <span className="trail-lab-type-meta">TRAIL-128</span>
      </div>
    </div>
  );
}

function CollectionRowContent({
  id,
  label,
  size,
  title,
}: {
  readonly id: string;
  readonly label: string;
  readonly size: string;
  readonly title: string;
}) {
  return (
    <div className="trail-lab-list-row__content">
      <span className="trail-lab-list-row__id">{id}</span>
      <span className="trail-lab-list-row__title">{title}</span>
      <span className="trail-lab-label-chip trail-lab-label-chip--quiet">{label}</span>
      <span className="trail-lab-list-row__meta">{size}</span>
    </div>
  );
}

export function TrailFoundationLab({ control, revision }: TrailFoundationLabProps) {
  const [layout, setLayout] = useState<"board" | "list">("list");
  const [priority, setPriority] = useState<TrailPriority | undefined>("high");
  const [selectionSelected, setSelectionSelected] = useState(false);

  return (
    <div className="trail-foundation-lab" data-runtime-control={control.kind}>
      <header className="trail-lab-hero">
        <div>
          <p className="trail-lab-eyebrow">Trail development showroom</p>
          <h1>Foundation lab</h1>
          <p className="trail-lab-hero__description">
            Production owners arranged for state comparison and live interaction inside the real Obsidian host.
          </p>
        </div>
        <div className="trail-lab-runtime" aria-live="polite">
          <span className="trail-lab-runtime__dot" />
          {runtimeLabel(control)}
          <span className="trail-lab-runtime__revision">r{revision}</span>
        </div>
      </header>

      <div className="trail-lab-source-note">
        <span className="trail-lab-source-note__label">Showroom contract</span>
        <span>Production owners only</span>
        <span>State Gallery</span>
        <span>Live Interaction</span>
        <span>Future owners omitted until implemented</span>
      </div>

      <LabSection
        description="Resolved visual roles and type hierarchy. Literal token values remain owned by the production stylesheet authority."
        id="visual-foundations"
        title="Visual Foundations"
      >
        <LabSpecimenRow
          kind="state-gallery"
          owner="design tokens"
          title="Token roles"
        >
          <TokenRolesSpecimen />
        </LabSpecimenRow>
        <LabSpecimenRow
          kind="state-gallery"
          owner="type tokens"
          title="Type hierarchy"
        >
          <TypeHierarchySpecimen />
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Generic production primitives shown without inventing the Stage 4 density or unavailable contracts that do not exist yet."
        id="primitives"
        title="Primitives"
      >
        <LabSpecimenRow kind="state-gallery" owner="TrailButton" title="Button">
          <LabControlGroup label="Default / primary / disabled">
            <TrailButton>Secondary action</TrailButton>
            <TrailButton variant="primary">Create issue</TrailButton>
            <TrailButton disabled>Disabled</TrailButton>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailIconButton" title="Icon button">
          <LabControlGroup label="Quiet actions">
            <TrailIconButton icon={<CalibrationIcon kind="search" />} label="Search specimen" />
            <TrailIconButton icon={<CalibrationIcon kind="dots" />} label="More specimen" />
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailInput / TrailTextarea / TrailCheckbox" title="Fields">
          <LabControlGroup label="Input / search / textarea">
            <TrailInput aria-label="Title" defaultValue="Polish keyboard navigation" readOnly size={24} />
            <TrailInput aria-label="Search" defaultValue="project" readOnly size={20} type="search" />
            <TrailTextarea
              aria-label="Description"
              cols={30}
              defaultValue="Keep the default path obvious."
              readOnly
              rows={2}
            />
          </LabControlGroup>
          <LabControlGroup label="Checkbox states">
            <TrailCheckbox checked={false} label="Unchecked specimen" readOnly />
            <TrailCheckbox checked label="Checked specimen" readOnly />
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Stage 4 still owns density and unavailable variants; this gallery only compares values supported by the current production owner."
          kind="state-gallery"
          owner="TrailProgress"
          title="Progress"
        >
          <LabStateGrid>
            <div className="trail-lab-progress-specimen">
              <TrailProgress label="Progress zero" max={12} value={0} />
              <span>0%</span>
            </div>
            <div className="trail-lab-progress-specimen">
              <TrailProgress label="Progress partial" max={12} value={8} />
              <span>67%</span>
            </div>
            <div className="trail-lab-progress-specimen">
              <TrailProgress label="Progress complete" max={12} value={12} />
              <span>100%</span>
            </div>
          </LabStateGrid>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailSeparator" title="Separator">
          <TrailSeparator aria-label="Separator specimen" />
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Reusable composition mechanics. Existing alignment debt is displayed as evidence and remains owned by Stage 4 rather than being silently redesigned here."
        id="patterns"
        title="Patterns"
      >
        <LabSpecimenRow kind="state-gallery" owner="TrailCollectionRow" title="Collection row">
          <div className="trail-lab-list">
            <div className="trail-lab-list__header">
              <span>Backlog</span>
              <span>3 states</span>
            </div>
            <TrailCollectionRow leading={<span className="trail-lab-status-glyph trail-lab-status-glyph--todo" />}>
              <CollectionRowContent id="TRAIL-128" label="Design" size="M" title="Normal collection row" />
            </TrailCollectionRow>
            <TrailCollectionRow highlighted leading={<span className="trail-lab-status-glyph trail-lab-status-glyph--todo" />}>
              <CollectionRowContent id="TRAIL-134" label="UI" size="L" title="Highlighted collection row" />
            </TrailCollectionRow>
            <TrailCollectionRow
              leading={<span className="trail-lab-status-glyph trail-lab-status-glyph--done" />}
              selected
              selectionControl={<TrailCheckbox checked label="Select TRAIL-119" readOnly />}
            >
              <CollectionRowContent id="TRAIL-119" label="Core" size="S" title="Selected collection row" />
            </TrailCollectionRow>
          </div>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailPropertyControl" title="Property control">
          <div className="trail-lab-property-panel">
            <div className="trail-lab-property-row">
              <span>Status</span>
              <TrailPropertyControl>
                <span className="trail-lab-status-glyph trail-lab-status-glyph--progress" />
                In progress
              </TrailPropertyControl>
            </div>
            <div className="trail-lab-property-row">
              <span>Estimate</span>
              <TrailPropertyControl density="compact">M</TrailPropertyControl>
            </div>
            <div className="trail-lab-property-row">
              <span>More</span>
              <TrailPropertyControl aria-label="More properties specimen">…</TrailPropertyControl>
            </div>
          </div>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="This is the current production View Bar contract. The required Display slot remains explicit alignment debt for Stage 4."
          kind="state-gallery"
          owner="TrailViewBar"
          title="Collection controls evidence"
        >
          <div className="trail-lab-view-bar-specimen">
            <TrailViewBar
              display={<TrailViewBarAction icon={<CalibrationIcon kind="sliders" />} label="Display" />}
              filter={<TrailViewBarAction icon={<CalibrationIcon kind="filter" />} label="Filter" />}
              label="Project workspace view controls"
              layout={(
                <TrailViewLayoutSwitch
                  label="Project layout"
                  onValueChange={setLayout}
                  options={[
                    { icon: <CalibrationIcon kind="list" />, label: "List layout", value: "list" },
                    { icon: <CalibrationIcon kind="board" />, label: "Board layout", value: "board" },
                  ]}
                  value={layout}
                />
              )}
            />
          </div>
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Trail-specific semantic presentation built from explicit props. Product workflow and data lookup stay outside these specimens."
        id="semantic-entities"
        title="Semantic Entities"
      >
        <LabSpecimenRow kind="live-interaction" owner="TrailPriorityPropertySelect" title="Priority property">
          <LabControlGroup label="Current value">
            <TrailPriorityPropertySelect onValueChange={setPriority} value={priority} />
            <span className="trail-lab-type-muted">Fixture value: {priority ?? "none"}</span>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailTriageRow" title="Triage row">
          <div className="trail-lab-list">
            <div className="trail-lab-list__header">
              <span>Review queue</span>
              <span>2 states</span>
            </div>
            <TrailTriageRow
              priority="urgent"
              reviewDue={<time dateTime="2026-09-03">Sep 3</time>}
              selected
              title="Review urgent capture before the next planning pass"
            />
            <TrailTriageRow
              highlighted
              priority={undefined}
              reviewDue={<time dateTime="2026-09-18">Sep 18</time>}
              title="A deliberately long Triage title that should truncate cleanly when the Obsidian pane becomes narrow"
            />
          </div>
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Only interaction behavior already owned by production components is shown. Action Registry, Peek, Confirmation, and standard Composer remain absent until their production owners exist."
        id="interactions"
        title="Interactions"
      >
        <LabSpecimenRow kind="live-interaction" owner="TrailCollectionRow + TrailCheckbox" title="Selection feedback">
          <div className="trail-lab-list">
            <TrailCollectionRow
              leading={<span className="trail-lab-status-glyph trail-lab-status-glyph--todo" />}
              selected={selectionSelected}
              selectionControl={(
                <TrailCheckbox
                  checked={selectionSelected}
                  label="Select interactive collection row"
                  onChange={(event) => setSelectionSelected(event.currentTarget.checked)}
                />
              )}
            >
              <CollectionRowContent
                id="TRAIL-201"
                label="Live"
                size="M"
                title="Toggle selection without changing semantic leading content"
              />
            </TrailCollectionRow>
          </div>
        </LabSpecimenRow>

        <LabSpecimenRow kind="live-interaction" owner="TrailViewLayoutSwitch" title="Layout choice">
          <LabControlGroup label={`Current: ${layout}`}>
            <TrailViewLayoutSwitch
              label="Live layout choice"
              onValueChange={setLayout}
              options={[
                { icon: <CalibrationIcon kind="list" />, label: "Live list layout", value: "list" },
                { icon: <CalibrationIcon kind="board" />, label: "Live board layout", value: "board" },
              ]}
              value={layout}
            />
          </LabControlGroup>
        </LabSpecimenRow>
      </LabSection>
    </div>
  );
}
