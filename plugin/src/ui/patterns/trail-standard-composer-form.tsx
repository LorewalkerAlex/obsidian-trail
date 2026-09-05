import type { ReactNode } from "react";

export function TrailStandardComposerForm({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <div className="trail-standard-composer-form">{children}</div>;
}

export function TrailStandardComposerEditor({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <div className="trail-standard-composer-form__editor">{children}</div>;
}

export function TrailStandardComposerRelation({
  children,
  label,
  required = false,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly required?: boolean;
}) {
  return (
    <div
      className="trail-standard-composer-form__relation"
      data-required={required ? "true" : undefined}
    >
      <div className="trail-standard-composer-form__relation-label">
        <span>{label}</span>
      </div>
      <div className="trail-standard-composer-form__relation-control">{children}</div>
    </div>
  );
}

export function TrailStandardComposerProperties({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <div
      aria-label={label}
      className="trail-standard-composer-form__properties"
      role="group"
    >
      {children}
    </div>
  );
}
