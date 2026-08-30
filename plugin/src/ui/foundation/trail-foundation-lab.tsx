import type { ReactNode } from "react";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import { TrailButton } from "../primitives/trail-button";
import { TrailIconButton } from "../primitives/trail-icon-button";
import { TrailInput } from "../primitives/trail-input";
import { TrailTextarea } from "../primitives/trail-textarea";

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

function LabSection({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly title: string;
}) {
  return (
    <section className="trail-lab-section">
      <header className="trail-lab-section__header">
        <h2>{title}</h2>
        {description === undefined ? null : <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

type CalibrationIconKind = "dots" | "filter" | "plus" | "search" | "sliders";

function CalibrationIcon({ kind }: { readonly kind: CalibrationIconKind }) {
  return <span aria-hidden="true" className={`trail-lab-icon trail-lab-icon--${kind}`} />;
}

export function TrailFoundationLab({ control, revision }: TrailFoundationLabProps) {
  return (
    <div className="trail-foundation-lab" data-runtime-control={control.kind}>
      <header className="trail-lab-hero">
        <div>
          <p className="trail-lab-eyebrow">Trail visual foundation</p>
          <h1>Foundation lab</h1>
          <p className="trail-lab-hero__description">
            Linear desktop dark reconstruction inside the real Obsidian host.
          </p>
        </div>
        <div className="trail-lab-runtime" aria-live="polite">
          <span className="trail-lab-runtime__dot" />
          {runtimeLabel(control)}
          <span className="trail-lab-runtime__revision">r{revision}</span>
        </div>
      </header>

      <div className="trail-lab-source-note">
        <span className="trail-lab-source-note__label">Linear 2026 dark reference</span>
        <span>Observed theme-editor palette</span>
        <span>Derived elevated surfaces</span>
        <span>Shared overlay contract</span>
        <span>Compact density</span>
      </div>

      <div className="trail-lab-grid trail-lab-grid--two">
        <LabSection
          description="The lab consumes resolved Trail design tokens; literal color values stay in the stylesheet token authority."
          title="Visual token roles"
        >
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
        </LabSection>

        <LabSection
          description="Application hierarchy comes from compact sizing, weight, and contrast rather than oversized headings."
          title="Type hierarchy"
        >
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
        </LabSection>
      </div>

      <LabSection
        description="Accepted production primitives are calibrated here alongside Lab-only static specimens; Lab-only states do not expand the production API."
        title="Controls"
      >
        <div className="trail-lab-control-groups">
          <div className="trail-lab-control-group">
            <span className="trail-lab-control-group__label">Buttons</span>
            <div className="trail-lab-control-row">
              <TrailButton variant="primary">Create issue</TrailButton>
              <button className="trail-lab-button trail-lab-button--secondary" type="button">Save</button>
              <button className="trail-lab-button trail-lab-button--ghost" type="button">Cancel</button>
              <button className="trail-lab-button trail-lab-button--secondary is-demo-hover" type="button">Hover</button>
              <TrailButton disabled>Disabled</TrailButton>
            </div>
          </div>

          <div className="trail-lab-control-group">
            <span className="trail-lab-control-group__label">View controls</span>
            <div className="trail-lab-control-row">
              <button className="trail-lab-view-control" type="button">
                <CalibrationIcon kind="filter" />
                Filter
              </button>
              <button className="trail-lab-view-control" type="button">
                <CalibrationIcon kind="sliders" />
                Display
              </button>
              <span className="trail-lab-control-divider" />
              <TrailIconButton
                icon={<CalibrationIcon kind="search" />}
                label="Search specimen"
              />
              <button aria-label="Create specimen" className="trail-lab-icon-button is-demo-hover" type="button">
                <CalibrationIcon kind="plus" />
              </button>
              <TrailIconButton
                icon={<CalibrationIcon kind="dots" />}
                label="More specimen"
              />
              <span className="trail-lab-tooltip">Search</span>
            </div>
          </div>

          <div className="trail-lab-control-group">
            <span className="trail-lab-control-group__label">Fields and layout</span>
            <div className="trail-lab-control-row trail-lab-control-row--wide">
              <TrailInput aria-label="Title" defaultValue="Polish keyboard navigation" readOnly size={24} />
              <TrailInput aria-label="Search" defaultValue="project" readOnly size={20} type="search" />
              <TrailTextarea
                aria-label="Description"
                cols={30}
                defaultValue="Keep the default path obvious."
                readOnly
                rows={2}
              />
              <div aria-label="Layout specimen" className="trail-lab-segmented" role="group">
                <button className="is-selected" type="button">List</button>
                <button type="button">Board</button>
              </div>
            </div>
          </div>
        </div>
      </LabSection>

      <div className="trail-lab-grid trail-lab-grid--two">
        <LabSection
          description="Rows stay dense and nearly flat; hover and selection are state surfaces, not cards."
          title="Collection density"
        >
          <div className="trail-lab-list">
            <div className="trail-lab-list__header">
              <span>Backlog</span>
              <span>8</span>
            </div>
            <div className="trail-lab-list-row">
              <span className="trail-lab-status-glyph trail-lab-status-glyph--todo" />
              <span className="trail-lab-list-row__id">TRAIL-128</span>
              <span className="trail-lab-list-row__title">Refine empty state hierarchy</span>
              <span className="trail-lab-label-chip">Design</span>
              <span className="trail-lab-list-row__meta">M</span>
            </div>
            <div className="trail-lab-list-row is-demo-hover">
              <span className="trail-lab-status-glyph trail-lab-status-glyph--progress" />
              <span className="trail-lab-list-row__id">TRAIL-134</span>
              <span className="trail-lab-list-row__title">Implement command menu surface</span>
              <span className="trail-lab-label-chip trail-lab-label-chip--quiet">UI</span>
              <span className="trail-lab-list-row__meta">L</span>
            </div>
            <div className="trail-lab-list-row is-selected">
              <span className="trail-lab-status-glyph trail-lab-status-glyph--done" />
              <span className="trail-lab-list-row__id">TRAIL-119</span>
              <span className="trail-lab-list-row__title">Reset legacy presentation</span>
              <span className="trail-lab-label-chip trail-lab-label-chip--quiet">Core</span>
              <span className="trail-lab-list-row__meta">S</span>
            </div>
          </div>
        </LabSection>

        <LabSection
          description="Property controls remain recognizable and compact; labels use color as identity rather than decoration."
          title="Property language"
        >
          <div className="trail-lab-property-panel">
            <div className="trail-lab-property-row">
              <span>Status</span>
              <button className="trail-lab-property-control" type="button">
                <span className="trail-lab-status-glyph trail-lab-status-glyph--progress" />
                In progress
              </button>
            </div>
            <div className="trail-lab-property-row">
              <span>Priority</span>
              <button className="trail-lab-property-control" type="button">
                <span aria-hidden="true" className="trail-lab-priority-glyph"><span /><span /><span /></span>
                High
              </button>
            </div>
            <div className="trail-lab-property-row">
              <span>Estimate</span>
              <button className="trail-lab-property-control trail-lab-property-control--compact" type="button">M</button>
            </div>
            <div className="trail-lab-property-row">
              <span>Labels</span>
              <div className="trail-lab-labels">
                <span className="trail-lab-label-chip">Design</span>
                <span className="trail-lab-label-chip trail-lab-label-chip--quiet">UI</span>
              </div>
            </div>
          </div>
        </LabSection>
      </div>

      <LabSection
        description="The menu specimen and native Obsidian menu consume one visual contract; the composer mirrors Linear's current issue-creation structure."
        title="Overlays and composer"
      >
        <div className="trail-lab-overlay-stage">
          <div className="trail-lab-menu" role="presentation">
            <div className="trail-lab-menu__item is-active">
              <span>Set priority</span><kbd>P</kbd>
            </div>
            <div className="trail-lab-menu__item">
              <span>Move to project</span><kbd>M</kbd>
            </div>
            <div className="trail-lab-menu__separator" />
            <div className="trail-lab-menu__item trail-lab-menu__item--danger">
              <span>Delete</span><kbd>⌫</kbd>
            </div>
          </div>

          <div className="trail-lab-composer" role="presentation">
            <div className="trail-lab-composer__context">
              <button className="trail-lab-property-control" type="button">Trail</button>
              <span className="trail-lab-composer__chevron">›</span>
              <button className="trail-lab-property-control" type="button">Template</button>
              <button aria-label="More composer options specimen" className="trail-lab-icon-button trail-lab-icon-button--quiet" type="button">
                <CalibrationIcon kind="dots" />
              </button>
            </div>
            <div className="trail-lab-composer__editor">
              <div className="trail-lab-composer__title">Improve project creation flow</div>
              <div className="trail-lab-composer__description">
                Make the default path obvious without adding visual noise.
              </div>
              <div className="trail-lab-composer__suggestions">
                <span>Suggestions</span>
                <span className="trail-lab-label-chip trail-lab-label-chip--quiet">Design</span>
                <span className="trail-lab-label-chip trail-lab-label-chip--quiet">Core</span>
              </div>
              <div className="trail-lab-composer__properties">
                <span className="trail-lab-property-control trail-lab-property-control--static">
                  <span className="trail-lab-status-glyph trail-lab-status-glyph--todo" />
                  Backlog
                </span>
                <span className="trail-lab-property-control trail-lab-property-control--static">
                  <span aria-hidden="true" className="trail-lab-priority-glyph"><span /><span /><span /></span>
                  High
                </span>
                <span className="trail-lab-property-control trail-lab-property-control--static">Project Trail</span>
                <span className="trail-lab-property-control trail-lab-property-control--static">M</span>
                <span className="trail-lab-property-control trail-lab-property-control--static">…</span>
              </div>
            </div>
            <div className="trail-lab-composer__footer">
              <span className="trail-lab-composer__attachment" aria-hidden="true">⌁</span>
              <TrailButton variant="primary">Create issue</TrailButton>
            </div>
          </div>
        </div>
      </LabSection>
    </div>
  );
}
