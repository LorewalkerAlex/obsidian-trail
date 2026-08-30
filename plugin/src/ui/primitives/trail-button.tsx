import type { ComponentPropsWithRef } from "react";

type NativeButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "className" | "style"
>;

export type TrailButtonProps = NativeButtonProps & {
  readonly variant?: "primary";
};

export function TrailButton({
  type = "button",
  variant,
  ...props
}: TrailButtonProps) {
  const className = variant === "primary"
    ? "trail-button trail-button--primary mod-cta"
    : "trail-button";

  return (
    <button
      {...props}
      className={className}
      type={type}
    />
  );
}
