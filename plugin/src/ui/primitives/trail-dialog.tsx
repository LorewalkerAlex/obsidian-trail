import type { ReactElement, ReactNode } from "react";
import { AlertDialog, Dialog } from "radix-ui";

/** Shared modal shell for lightweight Trail input/inspection interactions. */
export function TrailDialog(props: {
  readonly children: ReactNode;
  readonly description: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly title: string;
  readonly trigger?: ReactElement;
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      {props.trigger === undefined ? null : (
        <Dialog.Trigger asChild>{props.trigger}</Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="trail-dialog-overlay" />
        <Dialog.Content className="trail-dialog-content">
          <div className="trail-dialog__heading">
            <Dialog.Title className="trail-dialog__title">{props.title}</Dialog.Title>
            <Dialog.Description className="trail-dialog__description">
              {props.description}
            </Dialog.Description>
          </div>
          <div className="trail-dialog__body">{props.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TrailDialogClose(props: { readonly children: ReactElement }) {
  return <Dialog.Close asChild>{props.children}</Dialog.Close>;
}

/** Shared confirmation shell for destructive or consequential discrete actions. */
export function TrailAlertDialog(props: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
  readonly trigger: ReactElement;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{props.trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="trail-dialog-overlay" />
        <AlertDialog.Content className="trail-dialog-content trail-dialog-content--alert">
          <div className="trail-dialog__heading">
            <AlertDialog.Title className="trail-dialog__title">
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description className="trail-dialog__description">
              {props.description}
            </AlertDialog.Description>
          </div>
          <div className="trail-dialog__body">{props.children}</div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function TrailAlertDialogCancel(props: { readonly children: ReactElement }) {
  return <AlertDialog.Cancel asChild>{props.children}</AlertDialog.Cancel>;
}

export function TrailAlertDialogAction(props: { readonly children: ReactElement }) {
  return <AlertDialog.Action asChild>{props.children}</AlertDialog.Action>;
}

export function TrailDialogActions(props: { readonly children: ReactNode }) {
  return <div className="trail-dialog__actions">{props.children}</div>;
}
