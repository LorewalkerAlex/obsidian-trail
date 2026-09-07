import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react";

type NativeEmptyStateProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "className" | "style"
>;

export type TrailEmptyStateProps = NativeEmptyStateProps & {
  readonly action?: ReactNode;
  readonly description?: ReactNode;
  readonly title: ReactNode;
};

export function TrailEmptyState({
  action,
  description,
  title,
  ...props
}: TrailEmptyStateProps) {
  return (
    <div {...props} className="trail-empty-state">
      <div className="trail-empty-state__content">
        <div className="trail-empty-state__title">{title}</div>
        {description === undefined || description === null ? null : (
          <div className="trail-empty-state__description">{description}</div>
        )}
      </div>
      {action === undefined || action === null ? null : (
        <div className="trail-empty-state__action">{action}</div>
      )}
    </div>
  );
}
