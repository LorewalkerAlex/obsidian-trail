import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react";

import { TrailIconButton } from "../primitives/trail-icon-button";

type NativeViewBarActionProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "children" | "className" | "style"
>;

export type TrailViewBarActionProps = NativeViewBarActionProps & {
  readonly icon?: ReactNode;
  readonly label: string;
};

export function TrailViewBarAction({
  icon,
  label,
  type = "button",
  ...props
}: TrailViewBarActionProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className="trail-view-bar__action"
      type={type}
    >
      {icon === undefined ? null : (
        <span aria-hidden="true" className="trail-view-bar__action-icon">
          {icon}
        </span>
      )}
      <span className="trail-view-bar__action-label">{label}</span>
    </button>
  );
}

export type TrailViewLayoutOption<Value extends string> = {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: Value;
};

export type TrailViewLayoutSwitchProps<Value extends string> = {
  readonly label?: string;
  readonly onValueChange: (value: Value) => void;
  readonly options: readonly [
    TrailViewLayoutOption<Value>,
    TrailViewLayoutOption<Value>,
  ];
  readonly value: Value;
};

export function TrailViewLayoutSwitch<Value extends string>({
  label = "Layout",
  onValueChange,
  options,
  value,
}: TrailViewLayoutSwitchProps<Value>) {
  return (
    <div
      aria-label={label}
      className="trail-view-layout-switch"
      role="group"
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <TrailIconButton
            aria-pressed={isSelected}
            icon={(
              <span
                aria-hidden="true"
                className="trail-view-layout-switch__icon"
              >
                {option.icon}
              </span>
            )}
            key={option.value}
            label={option.label}
            onClick={() => {
              if (!isSelected) onValueChange(option.value);
            }}
          />
        );
      })}
    </div>
  );
}

export type TrailViewBarProps = {
  readonly label?: string;
  readonly leading: ReactNode;
  readonly trailing?: ReactNode;
};

export function TrailViewBar({
  label = "Collection controls",
  leading,
  trailing,
}: TrailViewBarProps) {
  return (
    <div
      aria-label={label}
      className="trail-view-bar"
      role="group"
    >
      <div className="trail-view-bar__leading">{leading}</div>
      {trailing === undefined ? null : (
        <div className="trail-view-bar__trailing">{trailing}</div>
      )}
    </div>
  );
}
