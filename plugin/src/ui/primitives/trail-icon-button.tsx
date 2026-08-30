import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react";

type NativeButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "children" | "className" | "style"
>;

export type TrailIconButtonProps = NativeButtonProps & {
  readonly icon: ReactNode;
  readonly label: string;
};

export function TrailIconButton({
  icon,
  label,
  type = "button",
  ...props
}: TrailIconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className="clickable-icon trail-icon-button"
      type={type}
    >
      {icon}
    </button>
  );
}
