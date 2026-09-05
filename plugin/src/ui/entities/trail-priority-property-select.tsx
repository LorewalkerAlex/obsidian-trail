import { Select } from "radix-ui";

import {
  TRAIL_PRIORITIES,
  type TrailPriority,
} from "../../domain/model/trail-values";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import {
  getTrailPriorityPresentation,
  TRAIL_PRIORITY_PRESENTATION_VALUES,
  TrailPriorityGlyph,
} from "./trail-priority";

const TRAIL_NO_PRIORITY_SELECT_VALUE = "__trail_no_priority__";

function toSelectValue(priority: TrailPriority | undefined): string {
  return priority ?? TRAIL_NO_PRIORITY_SELECT_VALUE;
}

function isTrailPriority(value: string): value is TrailPriority {
  return (TRAIL_PRIORITIES as readonly string[]).includes(value);
}

function fromSelectValue(value: string): TrailPriority | undefined {
  if (value === TRAIL_NO_PRIORITY_SELECT_VALUE) {
    return undefined;
  }

  if (isTrailPriority(value)) {
    return value;
  }

  throw new Error(`Unsupported Priority select value: ${value}`);
}

export interface TrailPriorityPropertySelectProps {
  readonly disabled?: boolean;
  readonly layer?: "menu" | "modal-child";
  readonly onValueChange: (priority: TrailPriority | undefined) => void;
  readonly value: TrailPriority | undefined;
}

function TrailPrioritySelectCheck() {
  return (
    <svg
      aria-hidden="true"
      className="trail-priority-select__check"
      viewBox="0 0 16 16"
    >
      <path d="M3.5 8.25 6.5 11l6-6" />
    </svg>
  );
}

export function TrailPriorityPropertySelect({
  disabled = false,
  layer = "menu",
  onValueChange,
  value,
}: TrailPriorityPropertySelectProps) {
  const presentation = getTrailPriorityPresentation(value);

  return (
    <Select.Root
      disabled={disabled}
      onValueChange={(nextValue: string) => onValueChange(fromSelectValue(nextValue))}
      value={toSelectValue(value)}
    >
      <Select.Trigger asChild>
        <TrailPropertyControl aria-label={`Priority: ${presentation.label}`}>
          <TrailPriorityGlyph decorative priority={value} />
          {presentation.label}
        </TrailPropertyControl>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          align="start"
          className="trail-priority-select"
          data-trail-transient-layer={layer}
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="trail-priority-select__viewport">
            {TRAIL_PRIORITY_PRESENTATION_VALUES.map((priority) => {
              const option = getTrailPriorityPresentation(priority);
              const selectValue = toSelectValue(priority);

              return (
                <Select.Item
                  className="trail-priority-select__item"
                  key={selectValue}
                  textValue={option.label}
                  value={selectValue}
                >
                  <span className="trail-priority-select__glyph">
                    <TrailPriorityGlyph decorative priority={priority} />
                  </span>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="trail-priority-select__indicator">
                    <TrailPrioritySelectCheck />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
