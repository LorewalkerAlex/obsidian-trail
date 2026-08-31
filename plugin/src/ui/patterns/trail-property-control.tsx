import type { ComponentPropsWithRef } from "react";

type NativeButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "className" | "style"
>;

export type TrailPropertyControlProps = NativeButtonProps & {
  readonly density?: "compact";
};

export function TrailPropertyControl({
  density,
  type = "button",
  ...props
}: TrailPropertyControlProps) {
  const className = density === "compact"
    ? "trail-property-control trail-property-control--compact"
    : "trail-property-control";

  return (
    <button
      {...props}
      className={className}
      type={type}
    />
  );
}
