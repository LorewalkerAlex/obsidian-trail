import { Popover } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

export interface TrailViewPopoverProps {
  readonly align?: "center" | "end" | "start";
  readonly children: ReactNode;
  readonly label: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly trigger: ReactElement;
}

export function TrailViewPopover({
  align = "start",
  children,
  label,
  onOpenChange,
  open,
  trigger,
}: TrailViewPopoverProps) {
  return (
    <Popover.Root onOpenChange={onOpenChange} open={open}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          aria-label={label}
          className="trail-view-popover"
          collisionPadding={8}
          sideOffset={4}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
