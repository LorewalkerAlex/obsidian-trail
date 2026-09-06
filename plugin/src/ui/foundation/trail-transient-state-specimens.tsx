import type { TrailLabel } from "../../domain/model/trail-configuration";
import {
  getTrailPriorityPresentation,
  TRAIL_PRIORITY_PRESENTATION_VALUES,
  TrailPriorityGlyph,
} from "../entities/trail-priority";
import { TrailLabelDots } from "../entities/trail-label";
import { TRAIL_FOUNDATION_CONFIGURATION } from "./trail-foundation-fixtures";

function PriorityCheckIcon() {
  return (
    <svg aria-hidden="true" className="trail-priority-select__check" viewBox="0 0 16 16">
      <path d="M3.5 8.25 6.5 11l6-6" />
    </svg>
  );
}

function LabelCheckIcon({ visible }: { readonly visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="trail-label-select__check"
      data-visible={visible ? "true" : "false"}
      viewBox="0 0 16 16"
    >
      <path d="M3.5 8.25 6.5 11l6-6" />
    </svg>
  );
}

export function TrailViewPopoverStateSpecimen() {
  return (
    <div className="trail-lab-grid trail-lab-grid--two">
      <div
        aria-label="Compact menu visual states"
        className="trail-view-popover trail-view-popover--compact"
        role="group"
      >
        <div className="trail-view-popover__stack">
          <div className="trail-view-popover__title">Order by</div>
          <button className="trail-view-popover__item" type="button">
            <span>Rest item</span>
          </button>
          <button
            className="trail-view-popover__item"
            data-trail-visual-state="hover"
            type="button"
          >
            <span>Hover item</span>
          </button>
          <button aria-pressed="true" className="trail-view-popover__item" type="button">
            <span>Selected item</span>
            <span
              aria-hidden="true"
              className="trail-view-popover__check"
              data-visible="true"
            >
              ✓
            </span>
          </button>
        </div>
      </div>

      <div
        aria-label="Search menu visual states"
        className="trail-view-popover"
        role="group"
      >
        <div className="trail-view-popover__stack">
          <button className="trail-view-popover__back" type="button">
            <span aria-hidden="true">‹</span>
            <span>Labels</span>
          </button>
          <input
            aria-label="Static menu search"
            className="trail-view-popover__search"
            data-trail-visual-state="focus"
            readOnly
            type="search"
            value="on"
          />
          <div className="trail-view-popover__options">
            <div className="trail-view-popover__group">Theme</div>
            <button aria-pressed="true" className="trail-view-popover__item" type="button">
              <span>Onboarding</span>
              <span
                aria-hidden="true"
                className="trail-view-popover__check"
                data-visible="true"
              >
                ✓
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrailPriorityPickerStateSpecimen() {
  return (
    <div
      aria-label="Priority picker visual states"
      className="trail-priority-select"
      role="listbox"
    >
      <div className="trail-priority-select__viewport">
        {TRAIL_PRIORITY_PRESENTATION_VALUES.map((priority) => {
          const presentation = getTrailPriorityPresentation(priority);
          const selected = priority === "high";
          const highlighted = priority === "medium";

          return (
            <div
              aria-selected={selected}
              className="trail-priority-select__item"
              data-highlighted={highlighted ? "" : undefined}
              data-state={selected ? "checked" : "unchecked"}
              key={priority ?? "none"}
              role="option"
            >
              <span className="trail-priority-select__glyph">
                <TrailPriorityGlyph decorative priority={priority} />
              </span>
              <span>{presentation.label}</span>
              <span className="trail-priority-select__indicator">
                {selected ? <PriorityCheckIcon /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrailLabelPickerStateSpecimen() {
  const design = TRAIL_FOUNDATION_CONFIGURATION.labels.find(({ id }) => id === "foundation-design");
  const onboarding = TRAIL_FOUNDATION_CONFIGURATION.labels.find(({ id }) => id === "foundation-onboarding");
  const navigation = TRAIL_FOUNDATION_CONFIGURATION.labels.find(({ id }) => id === "foundation-navigation");
  const visibleLabels = [design, onboarding, navigation].filter(
    (label): label is TrailLabel => label !== undefined,
  );

  return (
    <div className="trail-lab-grid trail-lab-grid--two">
      <div aria-label="Label picker selected states" className="trail-label-select" role="group">
        <input
          aria-label="Static label search"
          className="trail-label-select__search"
          placeholder="Search labels"
          readOnly
          type="search"
          value="on"
        />
        <div className="trail-label-select__options">
          <div className="trail-label-select__group">Matches</div>
          {visibleLabels.map((label) => {
            const selected = label.id === "foundation-onboarding";
            return (
              <button
                aria-pressed={selected}
                className="trail-label-select__item"
                key={label.id}
                type="button"
              >
                <TrailLabelDots labels={[label]} />
                <span className="trail-label-select__name">{label.name}</span>
                <LabelCheckIcon visible={selected} />
              </button>
            );
          })}
        </div>
      </div>

      <div aria-label="Label picker empty state" className="trail-label-select" role="group">
        <input
          aria-label="Static empty label search"
          className="trail-label-select__search"
          placeholder="Search labels"
          readOnly
          type="search"
          value="zzzz"
        />
        <div className="trail-label-select__options">
          <div className="trail-label-select__empty">No labels found.</div>
        </div>
      </div>
    </div>
  );
}

export function TrailDuePickerStateSpecimen() {
  return (
    <div aria-label="Due picker visual state" className="trail-due-select" role="group">
      <div className="trail-due-select__title">Review due</div>
      <label className="trail-due-select__field">
        <span>Date</span>
        <input
          aria-label="Static review due date"
          readOnly
          type="date"
          value="2026-09-12"
        />
      </label>
    </div>
  );
}
