import type { ComponentPropsWithRef } from "react";

export type TrailTextareaProps = Omit<
  ComponentPropsWithRef<"textarea">,
  "className" | "style"
>;

export function TrailTextarea(props: TrailTextareaProps) {
  return <textarea {...props} className="trail-textarea" />;
}
