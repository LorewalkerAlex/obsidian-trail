import type { ComponentPropsWithRef } from "react";

type NativeButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "className" | "style"
>;

export type TrailPropertyControlDensity = "compact" | "normal";

export type TrailPropertyControlProps = NativeButtonProps & {
  readonly density?: TrailPropertyControlDensity;
};

export function TrailPropertyControl({
  density = "normal",
  type = "button",
  ...props
}: TrailPropertyControlProps) {
  return (
    <button
      {...props}
      className={`trail-property-control trail-property-control--${density}`}
      data-density={density}
      type={type}
    />
  );
}
