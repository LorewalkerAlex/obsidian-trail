import type { ReactNode } from "react";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";

interface TrailFoundationLabProps {
  readonly control: TrailRuntimeControl;
  readonly revision: number;
}

const LINEAR_COLOR_SEED = [
  { label: "Main base", token: "bgBase", value: "#0E1012", swatch: "base" },
  { label: "Sidebar", token: "bgSub", value: "#060708", swatch: "sidebar" },
  { label: "Hover", token: "bgBaseHover", value: "#141517", swatch: "hover" },
  { label: "Accent", token: "accent", value: "#5E6AD2", swatch: "accent" },
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
        <span className="trail-lab-source-note__label">Linear 2026 dark</span>
        <span>Base LCH 4.66 / 1.41 / 265.732</span>
        <span>Elevated +3L / +1C</span>
        <span>Menu +5L / +1C</span>
        <span>Accent #5E6AD2</span>
        <span>Contrast 27</span>
      </div>

      <div className="trail-lab-grid trail-lab-grid--two">
        <LabSection
          description="Direct anchors from Linear's March 2026 in-app theme editor; elevated surfaces use its published relative offsets."
          title="Linear 2026 color seed"
        >
          <div className="trail-lab-swatches">
            {LINEAR_COLOR_SEED.map((color) => (
              <div className="trail-lab-swatch" key={color.token}>
                <span
                  aria-hidden="true"
                  className={`trail-lab-swatch__color trail-lab-swatch__color--${color.swatch}`}
                />
                <span className="trail-lab-swatch__meta">
                  <strong>{color.label}</strong>
                  <span>{color.token}</span>
                </span>
                <code>{color.value}</code>
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
        description="Controls stay compact. View controls remain quiet icon-plus-label actions rather than filled toolbar buttons."
        title="Controls"
      >
        <div className="trail-lab-control-groups">
          <div className="trail-lab-control-group">
            <span className="trail-lab-control-group__label">Buttons</span>
            <div className="trail-lab-control-row">
              <button className="trail-button trail-button--primary" type="button">Create issue</button>
              <button className="trail-button trail-button--secondary" type="button">Save</button>
              <button className="trail-button trail-button--ghost" type="button">Cancel</button>
              <button className="trail-button trail-button--secondary is-demo-hover" type="button">Hover</button>
              <button className="trail-button trail-button--secondary" disabled type="button">Disabled</button>
            </div>
          </div>

          <div className="trail-lab-control-group">
            <span className="trail-lab-control-group__label">View controls</span>
            <div className="trail-lab-control-row">
              <button className="trail-view-control" type="button">
                <CalibrationIcon kind="filter" />
                Filter
              </button>
              <button className="trail-view-control" type="button">
                <CalibrationIcon kind="sliders" />
                Display
              </button>
              <span className="trail-lab-control-divider" />
              <button aria-label="Search specimen" className="trail-icon-button" type="button">
                <CalibrationIcon kind="search" />
              </button>
              <button aria-label="Create specimen" className="trail-icon-button is-demo-hover" type="button">
                <CalibrationIcon kind="plus" />
              </button>
              <button aria-label="More specimen" className="trail-icon-button" type="button">
                <CalibrationIcon kind="dots" />
              </button>
              <span className="trail-lab-tooltip">Search</span>
            </div>
          </div>

          <div className="trail-lab-control-group">
            <span className="trail-lab-control-group__label">Fields and layout</span>
            <div className="trail-lab-control-row trail-lab-control-row--wide">
              <label className="trail-lab-field">
                <span className="trail-lab-field__label">Title</span>
                <input defaultValue="Polish keyboard navigation" readOnly />
              </label>
              <label className="trail-lab-field is-demo-focus">
                <span className="trail-lab-field__label">Search</span>
                <input defaultValue="project" readOnly />
              </label>
              <div aria-label="Layout specimen" className="trail-segmented" role="group">
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
              <span className="trail-status-glyph trail-status-glyph--todo" />
              <span className="trail-lab-list-row__id">TRAIL-128</span>
              <span className="trail-lab-list-row__title">Refine empty state hierarchy</span>
              <span className="trail-label-chip">Design</span>
              <span className="trail-lab-list-row__meta">M</span>
            </div>
            <div className="trail-lab-list-row is-demo-hover">
              <span className="trail-status-glyph trail-status-glyph--progress" />
              <span className="trail-lab-list-row__id">TRAIL-134</span>
              <span className="trail-lab-list-row__title">Implement command menu surface</span>
              <span className="trail-label-chip trail-label-chip--quiet">UI</span>
              <span className="trail-lab-list-row__meta">L</span>
            </div>
            <div className="trail-lab-list-row is-selected">
              <span className="trail-status-glyph trail-status-glyph--done" />
              <span className="trail-lab-list-row__id">TRAIL-119</span>
              <span className="trail-lab-list-row__title">Reset legacy presentation</span>
              <span className="trail-label-chip trail-label-chip--quiet">Core</span>
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
              <button className="trail-property-control" type="button">
                <span className="trail-status-glyph trail-status-glyph--progress" />
                In progress
              </button>
            </div>
            <div className="trail-lab-property-row">
              <span>Priority</span>
              <button className="trail-property-control" type="button">
                <span aria-hidden="true" className="trail-priority-glyph"><span /><span /><span /></span>
                High
              </button>
            </div>
            <div className="trail-lab-property-row">
              <span>Estimate</span>
              <button className="trail-property-control trail-property-control--compact" type="button">M</button>
            </div>
            <div className="trail-lab-property-row">
              <span>Labels</span>
              <div className="trail-lab-labels">
                <span className="trail-label-chip">Design</span>
                <span className="trail-label-chip trail-label-chip--quiet">UI</span>
              </div>
            </div>
          </div>
        </LabSection>
      </div>

      <LabSection
        description="Elevated menu and composer surfaces get the strongest separation. The composer mirrors Linear's current issue-creation structure."
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
              <button className="trail-property-control" type="button">Trail</button>
              <span className="trail-lab-composer__chevron">›</span>
              <button className="trail-property-control" type="button">Template</button>
              <button aria-label="More composer options specimen" className="trail-icon-button trail-icon-button--quiet" type="button">
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
                <span className="trail-label-chip trail-label-chip--quiet">Design</span>
                <span className="trail-label-chip trail-label-chip--quiet">Core</span>
              </div>
              <div className="trail-lab-composer__properties">
                <span className="trail-property-control trail-property-control--static">
                  <span className="trail-status-glyph trail-status-glyph--todo" />
                  Backlog
                </span>
                <span className="trail-property-control trail-property-control--static">
                  <span aria-hidden="true" className="trail-priority-glyph"><span /><span /><span /></span>
                  High
                </span>
                <span className="trail-property-control trail-property-control--static">Project Trail</span>
                <span className="trail-property-control trail-property-control--static">M</span>
                <span className="trail-property-control trail-property-control--static">…</span>
              </div>
            </div>
            <div className="trail-lab-composer__footer">
              <span className="trail-lab-composer__attachment" aria-hidden="true">⌁</span>
              <button className="trail-button trail-button--primary" type="button">Create issue</button>
            </div>
          </div>
        </div>
      </LabSection>
    </div>
  );
}
