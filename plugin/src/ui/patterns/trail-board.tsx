import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react";

type NativeBoardProps = Omit<
  ComponentPropsWithRef<"div">,
  "aria-label" | "children" | "className" | "style"
>;

type NativeBoardColumnProps = Omit<
  ComponentPropsWithRef<"section">,
  "aria-label" | "children" | "className" | "style"
>;

export type TrailBoardProps = NativeBoardProps & {
  readonly children: ReactNode;
  readonly label: string;
};

export function TrailBoard({
  children,
  label,
  ...props
}: TrailBoardProps) {
  return (
    <div {...props} aria-label={label} className="trail-board" role="region">
      {children}
    </div>
  );
}

export type TrailBoardColumnProps = NativeBoardColumnProps & {
  readonly children?: ReactNode;
  readonly count: number;
  readonly label: string;
  readonly leading?: ReactNode;
};

export function TrailBoardColumn({
  children,
  count,
  label,
  leading,
  ...props
}: TrailBoardColumnProps) {
  return (
    <section
      {...props}
      aria-label={`${label} issues`}
      className="trail-board__column"
    >
      <header className="trail-board__column-header">
        <span className="trail-board__column-identity">
          {leading === undefined ? null : (
            <span className="trail-board__column-leading">{leading}</span>
          )}
          <span className="trail-board__column-label">{label}</span>
        </span>
        <span className="trail-board__column-count">{count}</span>
      </header>
      <div className="trail-board__column-body">{children}</div>
    </section>
  );
}
