import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react";

type NativePageHeaderProps = Omit<
  ComponentPropsWithRef<"header">,
  "children" | "className" | "style"
>;

export type TrailPageHeaderProps = NativePageHeaderProps & {
  readonly actions?: ReactNode;
  readonly breadcrumb?: ReactNode;
  readonly title: ReactNode;
};

export function TrailPageHeader({
  actions,
  breadcrumb,
  title,
  ...props
}: TrailPageHeaderProps) {
  const hasBreadcrumb = breadcrumb !== undefined && breadcrumb !== null;

  return (
    <header
      {...props}
      className="trail-page-header"
      data-has-breadcrumb={hasBreadcrumb ? "true" : undefined}
    >
      <div className="trail-page-header__identity">
        {hasBreadcrumb ? (
          <div className="trail-page-header__breadcrumb">{breadcrumb}</div>
        ) : null}
        <h1 className="trail-page-header__title">{title}</h1>
      </div>
      {actions === undefined || actions === null ? null : (
        <div className="trail-page-header__actions">{actions}</div>
      )}
    </header>
  );
}
