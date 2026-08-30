import type { ComponentPropsWithRef } from "react";

export type TrailSeparatorProps = Omit<
  ComponentPropsWithRef<"hr">,
  "className" | "style"
>;

export function TrailSeparator(props: TrailSeparatorProps) {
  return <hr {...props} className="trail-separator" />;
}
