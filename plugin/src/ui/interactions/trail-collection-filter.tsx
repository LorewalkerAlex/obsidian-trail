import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { TrailCalendarDate } from "../../domain/rules/trail-temporal-rules";
import {
  type TrailCollectionFilterState,
  type TrailDiscreteFilterClause,
  type TrailDueFilterValue,
  type TrailFilterDiscreteValue,
  isTrailCollectionFilterActive,
} from "../../query/shared/trail-collection-filter";
import { TrailViewBarAction } from "../patterns/trail-view-bar";
import { TrailViewPopover } from "../patterns/trail-view-popover";

export interface TrailCollectionFilterOption {
  readonly group?: string;
  readonly label: string;
  readonly value: TrailFilterDiscreteValue;
}

export type TrailCollectionFilterProperty<PropertyId extends string> =
  | {
      readonly id: PropertyId;
      readonly kind: "discrete";
      readonly label: string;
      readonly options: readonly TrailCollectionFilterOption[];
      readonly searchable?: boolean;
    }
  | {
      readonly id: PropertyId;
      readonly kind: "due";
      readonly label: string;
    };

export interface TrailCollectionFilterProps<PropertyId extends string> {
  readonly onClearAll: () => void;
  readonly onClearClause: (propertyId: PropertyId) => void;
  readonly onSetDueValue: (propertyId: PropertyId, value: TrailDueFilterValue) => void;
  readonly onToggleDiscreteValue: (
    propertyId: PropertyId,
    value: TrailFilterDiscreteValue,
  ) => void;
  readonly properties: readonly TrailCollectionFilterProperty<PropertyId>[];
  readonly state: TrailCollectionFilterState<PropertyId>;
}

function discreteValueKey(value: TrailFilterDiscreteValue): string {
  return value.kind === "none" ? "none" : `value:${value.value}`;
}

function isDiscreteValueSelected(
  clause: TrailDiscreteFilterClause | undefined,
  value: TrailFilterDiscreteValue,
): boolean {
  if (clause === undefined) return false;
  const key = discreteValueKey(value);
  return clause.values.some((candidate) => discreteValueKey(candidate) === key);
}

const DUE_PRESETS = [
  { label: "Overdue", value: { kind: "overdue" } },
  { label: "Today", value: { kind: "today" } },
  { label: "This week", value: { kind: "this-week" } },
  { label: "This month", value: { kind: "this-month" } },
] as const satisfies readonly { readonly label: string; readonly value: TrailDueFilterValue }[];

function calendarDateToInputValue(date: TrailCalendarDate): string {
  return [
    String(date.year).padStart(4, "0"),
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0"),
  ].join("-");
}

function parseCalendarDate(value: string): TrailCalendarDate | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return undefined;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
  ) {
    return undefined;
  }
  return { day, month, year };
}

function dueValueLabel(value: TrailDueFilterValue): string {
  switch (value.kind) {
    case "overdue": return "Overdue";
    case "today": return "Today";
    case "this-week": return "This week";
    case "this-month": return "This month";
    case "date": return calendarDateToInputValue(value.date);
  }
}

function selectedDueValue(
  state: TrailCollectionFilterState,
  propertyId: string,
): TrailDueFilterValue | undefined {
  const clause = state[propertyId];
  return clause?.kind === "due" ? clause.value : undefined;
}

function selectedDiscreteClause(
  state: TrailCollectionFilterState,
  propertyId: string,
): TrailDiscreteFilterClause | undefined {
  const clause = state[propertyId];
  return clause?.kind === "discrete" ? clause : undefined;
}

function discreteSummary(
  property: Extract<TrailCollectionFilterProperty<string>, { readonly kind: "discrete" }>,
  clause: TrailDiscreteFilterClause,
): string {
  const labels = clause.values.map((selected) => (
    property.options.find((option) => discreteValueKey(option.value) === discreteValueKey(selected))?.label
    ?? (selected.kind === "none" ? "None" : selected.value)
  ));
  return labels.length <= 2
    ? labels.join(", ")
    : `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function clauseSummary<PropertyId extends string>(
  property: TrailCollectionFilterProperty<PropertyId>,
  state: TrailCollectionFilterState<PropertyId>,
): string | undefined {
  const clause = state[property.id];
  if (clause === undefined) return undefined;
  if (property.kind === "due") {
    return clause.kind === "due" ? dueValueLabel(clause.value) : undefined;
  }
  return clause.kind === "discrete" ? discreteSummary(property, clause) : undefined;
}

export function TrailCollectionFilter<PropertyId extends string>({
  onClearAll,
  onClearClause,
  onSetDueValue,
  onToggleDiscreteValue,
  properties,
  state,
}: TrailCollectionFilterProps<PropertyId>) {
  const [activePropertyId, setActivePropertyId] = useState<PropertyId | undefined>();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listFocusRef = useRef<HTMLButtonElement | null>(null);
  const detailFocusRef = useRef<HTMLElement | null>(null);
  const activeProperty = properties.find((property) => property.id === activePropertyId);
  const filterActive = isTrailCollectionFilterActive(state);

  const visibleOptions = useMemo(() => {
    if (activeProperty?.kind !== "discrete") return [];
    const normalized = search.trim().toLocaleLowerCase();
    if (normalized === "") return activeProperty.options;
    return activeProperty.options.filter((option) => (
      option.label.toLocaleLowerCase().includes(normalized)
      || option.group?.toLocaleLowerCase().includes(normalized) === true
    ));
  }, [activeProperty, search]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setActivePropertyId(undefined);
      setSearch("");
    }
  };

  useEffect(() => {
    if (!open) return;
    if (activeProperty === undefined) {
      listFocusRef.current?.focus();
    } else {
      detailFocusRef.current?.focus();
    }
  }, [activeProperty, open]);

  useEffect(() => {
    for (const property of properties) {
      if (property.kind !== "discrete") continue;
      const clause = selectedDiscreteClause(state, property.id);
      if (clause === undefined) continue;
      const available = new Set(property.options.map((option) => discreteValueKey(option.value)));
      for (const selected of clause.values) {
        if (!available.has(discreteValueKey(selected))) {
          onToggleDiscreteValue(property.id, selected);
        }
      }
    }
  }, [onToggleDiscreteValue, properties, state]);

  let lastGroup: string | undefined;

  return (
    <>
      <TrailViewPopover
        label={activeProperty === undefined ? "Filter" : `${activeProperty.label} filter`}
        onOpenChange={handleOpenChange}
        open={open}
        trigger={(
          <TrailViewBarAction
            data-active={filterActive ? "true" : undefined}
            label="Filter"
          />
        )}
      >
        {activeProperty === undefined ? (
          <div className="trail-view-popover__stack">
            <div className="trail-view-popover__title">Filter</div>
            {properties.map((property, index) => {
              const summary = clauseSummary(property, state);
              return (
                <button
                  className="trail-view-popover__item"
                  key={property.id}
                  onClick={() => {
                    setActivePropertyId(property.id);
                    setSearch("");
                  }}
                  ref={index === 0 ? listFocusRef : undefined}
                  type="button"
                >
                  <span>{property.label}</span>
                  {summary === undefined ? null : (
                    <span className="trail-view-popover__meta">{summary}</span>
                  )}
                </button>
              );
            })}
            {filterActive ? (
              <>
                <div className="trail-view-popover__separator" />
                <button
                  className="trail-view-popover__item trail-view-popover__item--muted"
                  onClick={onClearAll}
                  type="button"
                >
                  Clear filters
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="trail-view-popover__stack">
            <button
              className="trail-view-popover__back"
              onClick={() => {
                setActivePropertyId(undefined);
                setSearch("");
              }}
              type="button"
            >
              <span aria-hidden="true">‹</span>
              <span>{activeProperty.label}</span>
            </button>
            {activeProperty.kind === "discrete" ? (
              <>
                {activeProperty.searchable ? (
                  <input
                    aria-label={`Search ${activeProperty.label.toLocaleLowerCase()}`}
                    className="trail-view-popover__search"
                    onChange={(event) => setSearch(event.currentTarget.value)}
                    placeholder={`Search ${activeProperty.label.toLocaleLowerCase()}`}
                    ref={(element) => {
                      detailFocusRef.current = element;
                    }}
                    type="search"
                    value={search}
                  />
                ) : null}
                <div className="trail-view-popover__options">
                  {visibleOptions.map((option, index) => {
                    const groupChanged = option.group !== undefined && option.group !== lastGroup;
                    lastGroup = option.group;
                    const selected = isDiscreteValueSelected(
                      selectedDiscreteClause(state, activeProperty.id),
                      option.value,
                    );
                    return (
                      <Fragment key={discreteValueKey(option.value)}>
                        {groupChanged ? (
                          <div className="trail-view-popover__group">{option.group}</div>
                        ) : null}
                        <button
                          aria-pressed={selected}
                          className="trail-view-popover__item"
                          onClick={() => onToggleDiscreteValue(activeProperty.id, option.value)}
                          ref={!activeProperty.searchable && index === 0
                            ? (element) => {
                                detailFocusRef.current = element;
                              }
                            : undefined}
                          type="button"
                        >
                          <span>{option.label}</span>
                          <span
                            aria-hidden="true"
                            className="trail-view-popover__check"
                            data-visible={selected ? "true" : "false"}
                          >
                            ✓
                          </span>
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="trail-view-popover__options">
                {DUE_PRESETS.map((option, index) => {
                  const current = selectedDueValue(state, activeProperty.id);
                  const selected = current?.kind === option.value.kind;
                  return (
                    <button
                      aria-pressed={selected}
                      className="trail-view-popover__item"
                      key={option.value.kind}
                      onClick={() => {
                        onSetDueValue(activeProperty.id, option.value);
                        handleOpenChange(false);
                      }}
                      ref={index === 0
                        ? (element) => {
                            detailFocusRef.current = element;
                          }
                        : undefined}
                      type="button"
                    >
                      <span>{option.label}</span>
                      <span
                        aria-hidden="true"
                        className="trail-view-popover__check"
                        data-visible={selected ? "true" : "false"}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
                <div className="trail-view-popover__separator" />
                <label className="trail-view-popover__date-field">
                  <span>Pick date…</span>
                  <input
                    aria-label="Filter through date"
                    onChange={(event) => {
                      const date = parseCalendarDate(event.currentTarget.value);
                      if (date !== undefined) {
                        onSetDueValue(activeProperty.id, { date, kind: "date" });
                        handleOpenChange(false);
                      }
                    }}
                    type="date"
                    value={(() => {
                      const current = selectedDueValue(state, activeProperty.id);
                      return current?.kind === "date"
                        ? calendarDateToInputValue(current.date)
                        : "";
                    })()}
                  />
                </label>
              </div>
            )}
            {state[activeProperty.id] === undefined ? null : (
              <>
                <div className="trail-view-popover__separator" />
                <button
                  className="trail-view-popover__item trail-view-popover__item--muted"
                  onClick={() => onClearClause(activeProperty.id)}
                  type="button"
                >
                  Clear {activeProperty.label.toLocaleLowerCase()}
                </button>
              </>
            )}
          </div>
        )}
      </TrailViewPopover>

      {properties.map((property) => {
        const summary = clauseSummary(property, state);
        if (summary === undefined) return null;
        return (
          <span className="trail-filter-chip" key={property.id}>
            <button
              className="trail-filter-chip__body"
              onClick={() => {
                setActivePropertyId(property.id);
                setSearch("");
                setOpen(true);
              }}
              type="button"
            >
              {property.label} · {summary}
            </button>
            <button
              aria-label={`Clear ${property.label.toLocaleLowerCase()} filter`}
              className="trail-filter-chip__clear"
              onClick={() => onClearClause(property.id)}
              type="button"
            >
              ×
            </button>
          </span>
        );
      })}
    </>
  );
}
