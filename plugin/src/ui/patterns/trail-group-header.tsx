import type { ComponentPropsWithRef } from "react";

type NativeGroupHeaderProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "className" | "style"
>;

export type TrailGroupHeaderProps = NativeGroupHeaderProps & {
  readonly count: number;
  readonly expanded: boolean;
  readonly label: string;
  readonly onExpandedChange: (expanded: boolean) => void;
  readonly onIdentityActivate?: () => void;
};

function TrailGroupDisclosureIcon() {
  return (
    <svg
      aria-hidden="true"
      className="trail-group-header__disclosure-icon"
      focusable="false"
      viewBox="0 0 16 16"
    >
      <path d="M4.5 6 8 9.5 11.5 6" />
    </svg>
  );
}

export function TrailGroupHeader({
  count,
  expanded,
  label,
  onExpandedChange,
  onIdentityActivate,
  ...props
}: TrailGroupHeaderProps) {
  return (
    <div
      {...props}
      className="trail-group-header"
      data-expanded={expanded ? "true" : "false"}
    >
      <button
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
        className="trail-group-header__disclosure"
        onClick={() => onExpandedChange(!expanded)}
        type="button"
      >
        <TrailGroupDisclosureIcon />
      </button>

      {onIdentityActivate === undefined ? (
        <span className="trail-group-header__identity">{label}</span>
      ) : (
        <button
          className="trail-group-header__identity trail-group-header__identity--action"
          onClick={onIdentityActivate}
          type="button"
        >
          {label}
        </button>
      )}

      <span className="trail-group-header__count">{count}</span>
    </div>
  );
}
