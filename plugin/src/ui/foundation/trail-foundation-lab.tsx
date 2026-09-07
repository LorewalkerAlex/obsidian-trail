import { useState } from "react";

import {
  TRAIL_PRIORITIES,
  type TrailPriority,
} from "../../domain/model/trail-values";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import { TrailDueDate } from "../entities/trail-due";
import { TrailLabelDots } from "../entities/trail-label";
import { TrailPriorityPropertySelect } from "../entities/trail-priority-property-select";
import { TrailStatusGlyph } from "../entities/trail-status";
import { TrailTriageRow } from "../entities/trail-triage-row";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailConfirmationSurface } from "../patterns/trail-confirmation";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";
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
  TRAIL_FOUNDATION_CONFIGURATION,
  TRAIL_FOUNDATION_REFERENCE_TIMESTAMP,
} from "./trail-foundation-fixtures";
import {
  LabControlGroup,
  LabSection,
  LabSpecimenRow,
  LabStateGrid,
} from "./trail-lab-showroom";
import { TrailProjectPatternSpecimens } from "./trail-project-pattern-specimens";
import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";
import { TrailStandardComposerFamilySpecimen } from "./trail-standard-composer-family-specimen";
import {
  TrailTriagePropertyFamilySpecimen,
  TrailTriageReviewSpecimen,
  TrailTriageViewControlsSpecimen,
} from "./trail-triage-production-specimens";
import {
  TrailDuePickerStateSpecimen,
  TrailLabelPickerStateSpecimen,
  TrailPriorityPickerStateSpecimen,
  TrailViewPopoverStateSpecimen,
} from "./trail-transient-state-specimens";

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

export function TrailFoundationLab({ control, revision }: TrailFoundationLabProps) {
  const [actionActivations, setActionActivations] = useState(0);
  const [layout, setLayout] = useState<"board" | "list">("list");
  const [priority, setPriority] = useState<TrailPriority | undefined>("high");
  const [popoverChoice, setPopoverChoice] = useState("Issue");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [propertyActions, setPropertyActions] = useState(0);
  const [rowActivations, setRowActivations] = useState(0);
  const [selectionSelected, setSelectionSelected] = useState(false);
  const foundationLabels = TRAIL_FOUNDATION_CONFIGURATION.labels.filter(({ id }) => (
    id === "foundation-design" || id === "foundation-onboarding"
  ));

  return (
    <div className="trail-foundation-lab" data-runtime-control={control.kind}>
      <header className="trail-lab-hero">
        <div>
          <p className="trail-lab-eyebrow">Trail development showroom</p>
          <h1>Foundation lab</h1>
          <p className="trail-lab-hero__description">
            Production owners arranged for visual state comparison, composition review, and representative live mechanics inside the real Obsidian host.
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
        <span>Composition Gallery</span>
        <span>Live Mechanics</span>
        <span>Visual states visible by default</span>
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
        <LabSpecimenRow
          description="Pseudo-states are forced through the same production CSS state contract so the complete visual matrix is visible without pointer or keyboard setup."
          kind="state-gallery"
          owner="TrailButton"
          title="Button"
        >
          <LabControlGroup label="Secondary states">
            <TrailButton>Rest</TrailButton>
            <TrailButton data-trail-visual-state="hover">Hover</TrailButton>
            <TrailButton data-trail-visual-state="pressed">Pressed</TrailButton>
            <TrailButton data-trail-visual-state="focus">Focus</TrailButton>
            <TrailButton disabled>Disabled</TrailButton>
          </LabControlGroup>
          <LabControlGroup label="Primary states">
            <TrailButton variant="primary">Rest primary</TrailButton>
            <TrailButton data-trail-visual-state="hover" variant="primary">Hover primary</TrailButton>
            <TrailButton data-trail-visual-state="pressed" variant="primary">Pressed primary</TrailButton>
            <TrailButton data-trail-visual-state="focus" variant="primary">Focus primary</TrailButton>
            <TrailButton disabled variant="primary">Disabled primary</TrailButton>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailIconButton" title="Icon button">
          <LabControlGroup label="Quiet action states">
            <TrailIconButton icon={<CalibrationIcon kind="search" />} label="Icon rest" />
            <TrailIconButton data-trail-visual-state="hover" icon={<CalibrationIcon kind="search" />} label="Icon hover" />
            <TrailIconButton data-trail-visual-state="pressed" icon={<CalibrationIcon kind="search" />} label="Icon pressed" />
            <TrailIconButton data-trail-visual-state="focus" icon={<CalibrationIcon kind="search" />} label="Icon focus" />
            <TrailIconButton disabled icon={<CalibrationIcon kind="search" />} label="Icon disabled" />
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailInput / TrailTextarea / TrailCheckbox" title="Fields">
          <LabControlGroup label="Input states">
            <TrailInput aria-label="Input rest" defaultValue="Polish keyboard navigation" readOnly size={24} />
            <TrailInput aria-label="Input hover" data-trail-visual-state="hover" defaultValue="Hover state" readOnly size={18} />
            <TrailInput aria-label="Input focus" data-trail-visual-state="focus" defaultValue="Focus state" readOnly size={18} />
            <TrailInput aria-label="Input disabled" defaultValue="Disabled state" disabled size={18} />
          </LabControlGroup>
          <LabControlGroup label="Field types">
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
            <TrailCheckbox checked={false} disabled label="Disabled unchecked specimen" readOnly />
            <TrailCheckbox checked disabled label="Disabled checked specimen" readOnly />
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
              <span>4 states</span>
            </div>
            <TrailCollectionRow leading={<TrailStatusGlyph category="unstarted" label="Todo" />}>
              <CollectionRowContent id="TRAIL-128" label="Design" size="M" title="Normal collection row" />
            </TrailCollectionRow>
            <TrailCollectionRow
              data-trail-visual-state="hover"
              leading={<TrailStatusGlyph category="unstarted" label="Todo" />}
            >
              <CollectionRowContent id="TRAIL-131" label="UI" size="M" title="Hover collection row" />
            </TrailCollectionRow>
            <TrailCollectionRow highlighted leading={<TrailStatusGlyph category="unstarted" label="Todo" />}>
              <CollectionRowContent id="TRAIL-134" label="UI" size="L" title="Highlighted collection row" />
            </TrailCollectionRow>
            <TrailCollectionRow
              leading={<TrailStatusGlyph category="completed" label="Done" />}
              selected
              selectionControl={<TrailCheckbox checked label="Select TRAIL-119" readOnly />}
            >
              <CollectionRowContent id="TRAIL-119" label="Core" size="S" title="Selected collection row" />
            </TrailCollectionRow>
          </div>
        </LabSpecimenRow>

        <TrailProjectPatternSpecimens />

        <LabSpecimenRow
          description="Value density and interaction pseudo-states are visible together; semantic picker behavior stays with the entity owner."
          kind="state-gallery"
          owner="TrailPropertyControl"
          title="Property control"
        >
          <LabControlGroup label="Interaction states">
            <TrailPropertyControl>Rest</TrailPropertyControl>
            <TrailPropertyControl data-trail-visual-state="hover">Hover</TrailPropertyControl>
            <TrailPropertyControl data-trail-visual-state="pressed">Pressed</TrailPropertyControl>
            <TrailPropertyControl data-trail-visual-state="focus">Focus</TrailPropertyControl>
            <TrailPropertyControl disabled>Disabled</TrailPropertyControl>
          </LabControlGroup>
          <LabControlGroup label="Density">
            <TrailPropertyControl>Normal</TrailPropertyControl>
            <TrailPropertyControl density="compact">M</TrailPropertyControl>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Open, hover, selected/check, and focused-search states are visible without opening a Portal. The live open/select/close transition is exercised once below through the semantic picker mechanics specimen."
          kind="state-gallery"
          owner="TrailViewPopover visual contract"
          title="Popover surface states"
        >
          <TrailViewPopoverStateSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="The action shell exposes its complete pseudo-state matrix independently from any particular page control composition."
          kind="state-gallery"
          owner="TrailViewBarAction"
          title="View action"
        >
          <LabControlGroup label="Action states">
            <TrailViewBarAction icon={<CalibrationIcon kind="filter" />} label="View action rest" />
            <TrailViewBarAction data-trail-visual-state="hover" icon={<CalibrationIcon kind="filter" />} label="View action hover" />
            <TrailViewBarAction data-trail-visual-state="pressed" icon={<CalibrationIcon kind="filter" />} label="View action pressed" />
            <TrailViewBarAction data-trail-visual-state="focus" icon={<CalibrationIcon kind="filter" />} label="View action focus" />
            <TrailViewBarAction data-active="true" icon={<CalibrationIcon kind="filter" />} label="View action active" />
            <TrailViewBarAction disabled icon={<CalibrationIcon kind="filter" />} label="View action disabled" />
          </LabControlGroup>
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
        <TrailProjectProductionSpecimens />

        <LabSpecimenRow
          description="All stable Priority trigger values are shown at once. Picker opening and value transition are validated separately as shared mechanics."
          kind="state-gallery"
          owner="TrailPriorityPropertySelect"
          title="Priority property"
        >
          <LabControlGroup label="Value states">
            {[undefined, ...TRAIL_PRIORITIES].map((value) => (
              <TrailPriorityPropertySelect
                key={value ?? "none"}
                onValueChange={() => { /* static state gallery */ }}
                value={value}
              />
            ))}
            <TrailPriorityPropertySelect disabled onValueChange={() => {}} value="high" />
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="The full Priority menu is shown inline with one checked value and one highlighted row so the open surface does not depend on pointer interaction."
          kind="state-gallery"
          owner="TrailPriorityPropertySelect visual contract"
          title="Priority picker surface"
        >
          <TrailPriorityPickerStateSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Search, selected/check, and no-results states are shown as stable Label picker surfaces. Label toggle mechanics remain covered by the shared picker interaction contract rather than by this visual gallery."
          kind="state-gallery"
          owner="TrailLabelPropertySelect visual contract"
          title="Label picker surfaces"
        >
          <TrailLabelPickerStateSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="The date picker surface is visible in flow without invoking the host date control or opening a Popover."
          kind="state-gallery"
          owner="TrailDuePropertySelect visual contract"
          title="Due picker surface"
        >
          <TrailDuePickerStateSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow kind="state-gallery" owner="TrailTriageRow" title="Triage row">
          <div className="trail-lab-list">
            <div className="trail-lab-list__header">
              <span>Review queue</span>
              <span>2 states</span>
            </div>
            <TrailTriageRow
              labels={<TrailLabelDots labels={foundationLabels} />}
              priority="urgent"
              reviewDue={(
                <TrailDueDate
                  timestamp={TRAIL_FOUNDATION_REFERENCE_TIMESTAMP}
                  timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
                />
              )}
              selected
              title="Review urgent capture before the next planning pass"
            />
            <TrailTriageRow
              highlighted
              priority={undefined}
              reviewDue={(
                <TrailDueDate
                  timestamp={TRAIL_FOUNDATION_REFERENCE_TIMESTAMP + (6 * 24 * 60 * 60 * 1000)}
                  timezone={TRAIL_FOUNDATION_CONFIGURATION.temporal.timezone}
                />
              )}
              title="A deliberately long Triage title that should truncate cleanly when the Obsidian pane becomes narrow"
            />
          </div>
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Representative production owners are assembled with fixture data so hierarchy, density, alignment, and transient placement can be judged independently from workflow outcomes."
        id="compositions"
        title="Compositions"
      >
        <LabSpecimenRow
          description="Priority, Labels, and Due are assembled exactly as a Triage property family so cross-control rhythm can be reviewed as composition rather than as picker mechanics."
          kind="composition-gallery"
          owner="TrailPriorityPropertySelect + TrailLabelPropertySelect + TrailDuePropertySelect"
          title="Triage property family"
        >
          <TrailTriagePropertyFamilySpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="The current Triage page supplies real Filter properties and Order behavior to the shared View Bar and Popover owners; this specimen is judged as one control composition."
          kind="composition-gallery"
          owner="TrailTriageViewControls"
          title="Triage collection controls"
        >
          <TrailTriageViewControlsSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="The production Triage Review surface is embedded directly with fixture props so header actions, editor hierarchy, semantic properties, and content rhythm can be calibrated without copying page markup."
          kind="composition-gallery"
          owner="TrailTriageReviewSurface"
          title="Triage review surface"
        >
          <TrailTriageReviewSpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Triage, Issue, and Project use the same production Composer surface family so their hierarchy can be compared directly without invoking modal mechanics."
          kind="composition-gallery"
          owner="TrailComposerSurface + TrailStandardComposerForm"
          title="Standard Composer family"
        >
          <TrailStandardComposerFamilySpecimen />
        </LabSpecimenRow>

        <LabSpecimenRow
          description="Default and destructive confirmation content are both visible without a modal. Dialog focus, Escape, backdrop cancellation, and focus return are mechanics covered by the shared owner rather than repeated visual cases."
          kind="state-gallery"
          owner="TrailConfirmationSurface"
          title="Confirmation family"
        >
          <LabStateGrid>
            <TrailConfirmationSurface
              actions={(
                <>
                  <TrailButton>Cancel</TrailButton>
                  <TrailButton variant="primary">Confirm</TrailButton>
                </>
              )}
              description="Continue with the selected action."
              title="Confirm action?"
            />
            <TrailConfirmationSurface
              actions={(
                <>
                  <TrailButton>Cancel</TrailButton>
                  <TrailButton data-confirmation-tone="danger">Delete</TrailButton>
                </>
              )}
              description="This permanently removes the Triage entry. Trail does not provide undo."
              title="Delete this Triage entry?"
            />
          </LabStateGrid>
        </LabSpecimenRow>
      </LabSection>

      <LabSection
        description="Shared state transitions and event-routing contracts are exercised once here. Their visual endpoints stay in State Gallery or Composition Gallery instead of being rediscovered by clicking."
        id="interaction-mechanics"
        title="Interaction Mechanics"
      >
        <LabSpecimenRow
          description="A generic action proves activation feedback once; Button rest/hover/pressed/focus/disabled visuals are already frozen above."
          kind="live-mechanics"
          owner="TrailButton"
          title="Action activation"
        >
          <LabControlGroup label="Activation">
            <TrailButton onClick={() => setActionActivations((count) => count + 1)}>
              Activate action
            </TrailButton>
            <span aria-live="polite" className="trail-lab-type-muted" role="status">
              Action activations: {actionActivations}
            </span>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="One shared Popover proves open, choose, close, and resulting feedback. The menu's visual states are already frozen in the Popover surface State Gallery above."
          kind="live-mechanics"
          owner="TrailViewPopover"
          title="Popover transition"
        >
          <LabControlGroup label="Open / choose / close">
            <TrailViewPopover
              label="Mechanics popover"
              onOpenChange={setPopoverOpen}
              open={popoverOpen}
              trigger={<TrailButton>Open popover mechanics</TrailButton>}
              width="compact"
            >
              <div className="trail-view-popover__stack">
                <div className="trail-view-popover__title">Accept as</div>
                {["Issue", "Project"].map((choice) => (
                  <button
                    className="trail-view-popover__item"
                    key={choice}
                    onClick={() => {
                      setPopoverChoice(choice);
                      setPopoverOpen(false);
                    }}
                    type="button"
                  >
                    <span>{choice}</span>
                  </button>
                ))}
              </div>
            </TrailViewPopover>
            <span aria-live="polite" className="trail-lab-type-muted" role="status">
              Popover choice: {popoverChoice} · {popoverOpen ? "open" : "closed"}
            </span>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow
          description="One semantic picker proves open/select/value-transition mechanics. The stable Priority values themselves are already visible together in Semantic Entities."
          kind="live-mechanics"
          owner="TrailPriorityPropertySelect"
          title="Property selection"
        >
          <LabControlGroup label="Current value">
            <TrailPriorityPropertySelect onValueChange={setPriority} value={priority} />
            <span className="trail-lab-type-muted">Fixture value: {priority ?? "none"}</span>
          </LabControlGroup>
        </LabSpecimenRow>

        <LabSpecimenRow kind="live-mechanics" owner="TrailCollectionRow + TrailCheckbox" title="Selection feedback">
          <div className="trail-lab-list">
            <TrailCollectionRow
              leading={<TrailStatusGlyph category="unstarted" label="Todo" />}
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
          description="Nested property controls keep their own activation; ordinary row activation remains available from non-interactive row content."
          kind="live-mechanics"
          owner="TrailCollectionRow + TrailPropertyControl"
          title="Row intent separation"
        >
          <div className="trail-lab-list">
            <TrailCollectionRow
              leading={<TrailStatusGlyph category="unstarted" label="Todo" />}
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
                    <TrailStatusGlyph category="started" decorative />
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

        <LabSpecimenRow kind="live-mechanics" owner="TrailViewLayoutSwitch" title="Choice transition">
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
