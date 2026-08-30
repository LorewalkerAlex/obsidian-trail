import type { ComponentPropsWithRef } from "react";

type NativeProgressProps = Omit<
  ComponentPropsWithRef<"progress">,
  "aria-label" | "children" | "className" | "max" | "style" | "value"
>;

export type TrailProgressProps = NativeProgressProps & {
  readonly label: string;
  readonly max: number;
  readonly value: number;
};

export function TrailProgress({
  label,
  max,
  value,
  ...props
}: TrailProgressProps) {
  return (
    <progress
      {...props}
      aria-label={label}
      className="trail-progress"
      max={max}
      value={value}
    />
  );
}
