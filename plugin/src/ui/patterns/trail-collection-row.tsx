import type {
  ComponentPropsWithRef,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";

type NativeCollectionRowProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "className" | "style"
>;

export type TrailCollectionRowProps = NativeCollectionRowProps & {
  readonly children: ReactNode;
  readonly highlighted?: boolean;
  readonly leading?: ReactNode;
  readonly selected?: boolean;
  readonly selectionControl?: ReactNode;
};

function isSelectionControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest(".trail-collection-row__selection") !== null;
}

export function TrailCollectionRow({
  children,
  highlighted = false,
  leading,
  onClick,
  onKeyDown,
  selected = false,
  selectionControl,
  ...props
}: TrailCollectionRowProps) {
  const hasLeading = leading !== undefined && leading !== null;
  const selectable = selectionControl !== undefined && selectionControl !== null;
  const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (isSelectionControlTarget(event.target)) return;
    onClick?.(event);
  };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (isSelectionControlTarget(event.target)) return;
    onKeyDown?.(event);
  };

  return (
    <div
      {...props}
      className="trail-collection-row"
      data-highlighted={highlighted ? "true" : undefined}
      data-selectable={selectable ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {selectable ? (
        <span className="trail-collection-row__selection">
          {selectionControl}
        </span>
      ) : null}
      {hasLeading ? (
        <span className="trail-collection-row__leading">
          {leading}
        </span>
      ) : null}
      <div className="trail-collection-row__content">{children}</div>
    </div>
  );
}
