import type { ComponentPropsWithRef } from "react";

export type TrailInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "className" | "style"
>;

export function TrailInput({
  type = "text",
  ...props
}: TrailInputProps) {
  return <input {...props} className="trail-input" type={type} />;
}
