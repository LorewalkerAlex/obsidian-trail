import type { ComponentPropsWithRef } from "react";

type NativeProgressProps = Omit<
  ComponentPropsWithRef<"progress">,
  "aria-label" | "children" | "className" | "max" | "style" | "value"
>;

export type TrailProgressDensity = "normal" | "compact" | "micro";

type TrailProgressBaseProps = NativeProgressProps & {
  readonly density?: TrailProgressDensity;
  readonly label: string;
};

export type TrailProgressProps = TrailProgressBaseProps & (
  | {
      readonly max: number;
      readonly unavailable?: false;
      readonly value: number;
    }
  | {
      readonly max?: never;
      readonly unavailable: true;
      readonly value?: never;
    }
);

function progressClassName(
  density: TrailProgressDensity,
  unavailable: boolean,
): string {
  return [
    "trail-progress",
    `trail-progress--${density}`,
    unavailable ? "trail-progress--unavailable" : null,
  ].filter((className) => className !== null).join(" ");
}

export function TrailProgress(props: TrailProgressProps) {
  if (props.unavailable === true) {
    const {
      density = "normal",
      label,
      unavailable,
      ...nativeProps
    } = props;

    return (
      <progress
        {...nativeProps}
        aria-label={label}
        aria-valuetext="Unavailable"
        className={progressClassName(density, true)}
        data-unavailable={unavailable ? "true" : undefined}
        max={1}
        value={0}
      />
    );
  }

  const {
    density = "normal",
    label,
    max,
    unavailable,
    value,
    ...nativeProps
  } = props;

  return (
    <progress
      {...nativeProps}
      aria-label={label}
      className={progressClassName(density, false)}
      data-unavailable={unavailable ? "true" : undefined}
      max={max}
      value={value}
    />
  );
}
