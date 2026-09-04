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

const TRAIL_COLLECTION_ROW_INTERACTIVE_SELECTOR = [
  ".trail-collection-row__selection",
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='switch']",
].join(", ");

function isNestedInteractiveTarget(
  target: EventTarget | null,
  row: HTMLDivElement,
): boolean {
  if (!(target instanceof Element) || target === row) return false;
  const interactive = target.closest(TRAIL_COLLECTION_ROW_INTERACTIVE_SELECTOR);
  return interactive !== null && interactive !== row && row.contains(interactive);
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
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return;
    onClick?.(event);
  };
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return;
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
