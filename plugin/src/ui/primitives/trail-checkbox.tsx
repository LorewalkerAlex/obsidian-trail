import type { ComponentPropsWithRef } from "react";

type NativeCheckboxProps = Omit<
  ComponentPropsWithRef<"input">,
  "aria-label" | "className" | "style" | "type"
>;

export type TrailCheckboxProps = NativeCheckboxProps & {
  readonly label: string;
};

export function TrailCheckbox({
  label,
  ...props
}: TrailCheckboxProps) {
  return (
    <input
      {...props}
      aria-label={label}
      className="trail-checkbox"
      type="checkbox"
    />
  );
}
