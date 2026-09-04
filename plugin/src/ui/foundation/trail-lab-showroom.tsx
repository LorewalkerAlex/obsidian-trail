import { useId, type ReactNode } from "react";

export type LabSectionId =
  | "visual-foundations"
  | "primitives"
  | "patterns"
  | "semantic-entities"
  | "interactions";

export function LabSection({
  children,
  description,
  id,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly id: LabSectionId;
  readonly title: string;
}) {
  const headingId = `trail-lab-section-${id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="trail-lab-section"
      data-lab-category={id}
    >
      <header className="trail-lab-section__header">
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="trail-lab-control-groups">{children}</div>
    </section>
  );
}

export function LabDescription({ children }: { readonly children: ReactNode }) {
  return <p>{children}</p>;
}

export function LabStateGrid({ children }: { readonly children: ReactNode }) {
  return <div className="trail-lab-grid trail-lab-grid--two">{children}</div>;
}

export function LabControlGroup({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <div className="trail-lab-control-row trail-lab-control-row--wide">
      <span className="trail-lab-type-meta">{label}</span>
      {children}
    </div>
  );
}

export function LabSpecimenRow({
  children,
  description,
  kind,
  owner,
  title,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly kind: "live-interaction" | "state-gallery";
  readonly owner: string;
  readonly title: string;
}) {
  const kindLabel = kind === "state-gallery" ? "State Gallery" : "Live Interaction";
  const titleId = useId();
  const kindId = `${titleId}-kind`;

  return (
    <div
      aria-describedby={kindId}
      aria-labelledby={titleId}
      className="trail-lab-control-group"
      data-lab-owner={owner}
      data-lab-specimen-kind={kind}
      role="group"
    >
      <div className="trail-lab-control-group__label">
        <span id={titleId}>{title}</span>
        <div className="trail-lab-type-meta" id={kindId}>{kindLabel}</div>
      </div>
      <div>
        {description === undefined ? null : (
          <LabDescription>{description}</LabDescription>
        )}
        {children}
      </div>
    </div>
  );
}
