import { Popover } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

export type TrailViewPopoverWidth = "compact" | "default";

export interface TrailViewPopoverProps {
  readonly align?: "center" | "end" | "start";
  readonly children: ReactNode;
  readonly label: string;
  readonly layer?: "menu" | "modal-child";
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly trigger: ReactElement;
  readonly width?: TrailViewPopoverWidth;
}

export function TrailViewPopover({
  align = "start",
  children,
  label,
  layer = "menu",
  onOpenChange,
  open,
  trigger,
  width = "default",
}: TrailViewPopoverProps) {
  return (
    <Popover.Root onOpenChange={onOpenChange} open={open}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          aria-label={label}
          className={`trail-view-popover trail-view-popover--${width}`}
          collisionPadding={8}
          data-trail-transient-layer={layer}
          data-width={width}
          sideOffset={4}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
