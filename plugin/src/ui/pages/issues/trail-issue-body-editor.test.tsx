import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const editorHarness = vi.hoisted((): {
  destroy: () => void;
  focus: () => void;
  handlers: null | {
    blur?: (event: FocusEvent, view: unknown) => boolean;
    keydown?: (event: KeyboardEvent, view: unknown) => boolean;
  };
  value: string;
  view: unknown;
} => ({
  destroy: vi.fn(),
  focus: vi.fn(),
  handlers: null,
  value: "",
  view: null,
}));

vi.mock("@codemirror/view", () => {
  class EditorView {
    static readonly contentAttributes = {
      of: (attributes: Record<string, string>) => ({ attributes, kind: "content-attributes" }),
    };
    static readonly domEventHandlers = (handlers: typeof editorHarness.handlers) => {
      editorHarness.handlers = handlers;
      return { handlers, kind: "dom-event-handlers" };
    };
    static readonly lineWrapping = { kind: "line-wrapping" };

    public readonly state = {
      doc: {
        toString: () => editorHarness.value,
      },
    };

    public constructor(config: { readonly doc: string; readonly parent: HTMLElement }) {
      editorHarness.value = config.doc;
      editorHarness.view = this;
      const content = config.parent.ownerDocument.createElement("div");
      content.className = "cm-content";
      content.setAttribute("contenteditable", "true");
      content.textContent = config.doc;
      config.parent.append(content);
    }

    public focus(): void {
      editorHarness.focus();
    }

    public destroy(): void {
      editorHarness.destroy();
    }
  }

  return { EditorView };
});

import { TrailIssueBodyEditor } from "./trail-issue-body-editor";

describe("TrailIssueBodyEditor", () => {
  it("preserves its CodeMirror session when pointer focus moves into the persistent Inspector", () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    const { unmount } = render(
      <>
        <TrailIssueBodyEditor
          initialValue="Initial Markdown"
          onCancel={onCancel}
          onCommit={onCommit}
        />
        <aside className="trail-inspector">
          <button type="button">Inspector property</button>
        </aside>
      </>,
    );

    expect(screen.getByText("Initial Markdown")).toHaveClass("cm-content");
    expect(editorHarness.focus).toHaveBeenCalledTimes(1);

    editorHarness.value = "Edited **Markdown**";
    const inspectorProperty = screen.getByRole("button", { name: "Inspector property" });
    fireEvent.pointerDown(inspectorProperty);
    editorHarness.handlers?.blur?.(new FocusEvent("blur"), editorHarness.view);

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(editorHarness.destroy).not.toHaveBeenCalled();

    unmount();
    expect(editorHarness.destroy).toHaveBeenCalled();
  });

  it("preserves its CodeMirror session when keyboard focus moves into the persistent Inspector", () => {
    const onCommit = vi.fn();

    render(
      <>
        <TrailIssueBodyEditor
          initialValue="Initial Markdown"
          onCancel={vi.fn()}
          onCommit={onCommit}
        />
        <aside className="trail-inspector">
          <button type="button">Inspector property</button>
        </aside>
      </>,
    );

    const inspectorProperty = screen.getByRole("button", { name: "Inspector property" });
    editorHarness.handlers?.blur?.(
      new FocusEvent("blur", { relatedTarget: inspectorProperty }),
      editorHarness.view,
    );

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("still commits its current document when focus leaves the editing/detail surfaces", () => {
    const onCommit = vi.fn();

    render(
      <TrailIssueBodyEditor
        initialValue="Initial Markdown"
        onCancel={vi.fn()}
        onCommit={onCommit}
      />,
    );

    editorHarness.value = "Edited **Markdown**";
    editorHarness.handlers?.blur?.(new FocusEvent("blur"), editorHarness.view);

    expect(onCommit).toHaveBeenCalledWith("Edited **Markdown**");
  });

  it("lets Escape cancel the local editor session without committing", () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    render(
      <TrailIssueBodyEditor
        initialValue="Draft body"
        onCancel={onCancel}
        onCommit={onCommit}
      />,
    );

    const event = new KeyboardEvent("keydown", { cancelable: true, key: "Escape" });
    const handled = editorHarness.handlers?.keydown?.(event, editorHarness.view);

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("uses Ctrl/Cmd+Enter as an explicit save shortcut without double-committing on blur", () => {
    const onCommit = vi.fn();

    const { unmount } = render(
      <TrailIssueBodyEditor
        initialValue="Shortcut body"
        onCancel={vi.fn()}
        onCommit={onCommit}
      />,
    );

    editorHarness.value = "Shortcut **edit**";
    const event = new KeyboardEvent("keydown", {
      cancelable: true,
      ctrlKey: true,
      key: "Enter",
    });
    const handled = editorHarness.handlers?.keydown?.(event, editorHarness.view);
    editorHarness.handlers?.blur?.(new FocusEvent("blur"), editorHarness.view);

    expect(handled).toBe(true);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("Shortcut **edit**");

    unmount();
    expect(editorHarness.destroy).toHaveBeenCalled();
  });
});
