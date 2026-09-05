import {
  useRef,
  useState,
} from "react";

import type { TrailPriority } from "../../domain/model/trail-values";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import { TrailPriorityPropertySelect } from "../entities/trail-priority-property-select";
import { TrailTriageRow } from "../entities/trail-triage-row";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailComposer } from "../patterns/trail-composer";
import { TrailConfirmation } from "../patterns/trail-confirmation";
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

type CalibrationIconKind = "board" | "dots" | "filter" | "list" | "search";

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
      <span className="trail-lab-list-row__primary">
        <span className="trail-lab-list-row__title">{title}</span>
      </span>
      <span className="trail-lab-list-row__trailing">
        <span className="trail-lab-label-chip trail-lab-label-chip--quiet">{label}</span>
        <span className="trail-lab-list-row__meta">{size}</span>
      </span>
    </div>
  );
}

function ComposerSpecimen() {
  const [created, setCreated] = useState(0);
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const openComposer = () => {
    setDescription("");
    setTitle("");
    setOpen(true);
  };

  return (
    <LabControlGroup label="Standard creation shell">
      <TrailButton onClick={openComposer}>Open composer specimen</TrailButton>
      <span aria-live="polite" className="trail-lab-type-muted">
        Created specimens: {created}
      </span>
      <TrailComposer
        canSubmit={title.trim().length > 0}
        context="Triage"
        dirty={title !== "" || description !== ""}
        initialFocusRef={titleRef}
        onDismiss={() => setOpen(false)}
        onSubmit={() => {
          setCreated((count) => count + 1);
          setOpen(false);
        }}
        open={open}
        submitLabel="Create"
      >
        <div className="trail-composer__fields">
          <TrailInput
            aria-label="Composer specimen title"
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Title"
            ref={titleRef}
            value={title}
          />
          <TrailTextarea
            aria-label="Composer specimen description"
            onChange={(event) => setDescription(event.currentTarget.value)}
            placeholder="Add description..."
            rows={4}
            value={description}
          />
        </div>
      </TrailComposer>
    </LabControlGroup>
  );
}

export function TrailFoundationLab({ control, revision }: TrailFoundationLabProps) {
  const [confirmationActions, setConfirmationActions] = useState(0);
  const [layout, setLayout] = useState<"board" | "list">("list");
  const [priority, setPriority] = useState<TrailPriority | undefined>("high");
  const [propertyActions, setPropertyActions] = useState(0);
  const [rowActivations, setRowActivations] = useState(0);
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
        description="Generic production primitives shown without inventing future workflow-specific behavior."
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
          description="One production owner now covers value states, normal/compact/micro density, and unavailable presentation without owning any progress calculation."
          kind="state-gallery"
          owner="TrailProgress"
          title="Progress"
        >
          <div className="trail-lab-property-panel">
            <div className="trail-lab-property-row">
              <span>Normal · 0%</span>
              <TrailProgress label="Progress zero" max={12} value={0} />
            </div>
            <div className="trail-lab-property-row">
              <span>Normal · 67%</span>
              <TrailProgress label="Progress partial" max={12} value={8} />
            </div>
            <div className="trail-lab-property-row">
              <span>Normal · 100%</span>
              <TrailProgress label="Progress complete" max={12} value={12} />
            </div>
            <div className="trail-lab-property-row">
              <span>Compact · 67%</span>
              <TrailProgress density="compact" label="Progress compact" max={12} value={8} />
            </div>
            <div className="trail-lab-property-row">
              <span>Micro · 67%</span>
              <TrailProgress density="micro" label="Progress micro" max={12} value={8} />
            </div>
            <div className="trail-lab-property-row">
              <span>Unavailable</span>
              <TrailProgress label="Progress unavailable" unavailable />
            </div>
          </div>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailSeparator" title="Separator">
          <TrailSeparator aria-label="Separator specimen" />
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Reusable composition mechanics shown through production owners with page-supplied controls."
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

        <LabSpecimenRow
          description="The production shell exposes normal, compact, and native disabled states while property identity and picker behavior remain semantic-consumer responsibilities."
          kind="state-gallery"
          owner="TrailPropertyControl"
          title="Property control"
        >
          <div className="trail-lab-property-panel">
            <div className="trail-lab-property-row">
              <span>Normal</span>
              <TrailPropertyControl>
                <span className="trail-lab-status-glyph trail-lab-status-glyph--progress" />
                In progress
              </TrailPropertyControl>
            </div>
            <div className="trail-lab-property-row">
              <span>Compact</span>
              <TrailPropertyControl density="compact">M</TrailPropertyControl>
            </div>
            <div className="trail-lab-property-row">
              <span>Disabled</span>
              <TrailPropertyControl disabled>Unavailable</TrailPropertyControl>
            </div>
          </div>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Leading and trailing slots are supplied by the page. This project-style specimen intentionally has no generic Display control."
          kind="state-gallery"
          owner="TrailViewBar"
          title="Collection controls"
        >
          <div className="trail-lab-view-bar-specimen">
            <TrailViewBar
              label="Project workspace view controls"
              leading={<TrailViewBarAction icon={<CalibrationIcon kind="filter" />} label="Filter" />}
              trailing={(
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
        description="Only interaction behavior already owned by production components is shown. Action Registry and Peek remain absent until their production owners exist."
        id="interactions"
        title="Interactions"
      >
        <LabSpecimenRow
          description="Shared creation shell owns transient focus, dirty-dismiss, keyboard submit, feedback, and overlay mechanics while consumers supply entity fields and submit intent."
          kind="live-interaction"
          owner="TrailComposer"
          title="Composer"
        >
          <ComposerSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Shared guarded-action mechanics keep safe focus, cancellation, concrete consequence copy, and explicit confirmation in one production owner."
          kind="live-interaction"
          owner="TrailConfirmation"
          title="Confirmation"
        >
          <LabControlGroup label="Delete confirmation">
            <TrailConfirmation
              confirmLabel="Delete specimen"
              description="Permanently remove this specimen. Trail does not provide undo."
              onConfirm={() => setConfirmationActions((count) => count + 1)}
              title="Delete specimen?"
              tone="danger"
              trigger={<TrailButton>Open delete confirmation</TrailButton>}
            />
            <span aria-live="polite" className="trail-lab-type-muted">
              Confirmed actions: {confirmationActions}
            </span>
          </LabControlGroup>
        </LabSpecimenRow>

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

        <LabSpecimenRow
          description="Nested property controls keep their own intent; ordinary row activation remains available from non-interactive row content."
          kind="live-interaction"
          owner="TrailCollectionRow + TrailPropertyControl"
          title="Row intent separation"
        >
          <div className="trail-lab-list">
            <TrailCollectionRow
              leading={<span className="trail-lab-status-glyph trail-lab-status-glyph--todo" />}
              onClick={() => setRowActivations((count) => count + 1)}
            >
              <div className="trail-lab-list-row__content">
                <span className="trail-lab-list-row__id">TRAIL-203</span>
                <span className="trail-lab-list-row__primary">
                  <span className="trail-lab-list-row__title">Activate row content</span>
                </span>
                <span className="trail-lab-list-row__trailing">
                  <TrailPropertyControl
                    aria-label="Change inline status"
                    onClick={() => setPropertyActions((count) => count + 1)}
                  >
                    <span className="trail-lab-status-glyph trail-lab-status-glyph--progress" />
                    In progress
                  </TrailPropertyControl>
                </span>
              </div>
            </TrailCollectionRow>
          </div>
          <div aria-live="polite" className="trail-lab-interaction-feedback" role="status">
            Row activations: {rowActivations} · Property actions: {propertyActions}
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
