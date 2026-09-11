// Obsidian provides CodeMirror as a host peer; Trail externalizes it from the plugin bundle.
// eslint-disable-next-line import/no-extraneous-dependencies -- Obsidian provides CodeMirror as a host peer.
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";

export interface TrailIssueBodyEditorProps {
  readonly initialValue: string;
  readonly onCancel: () => void;
  readonly onCommit: (value: string) => void;
}

function isInsidePersistentInspector(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".trail-inspector") !== null;
}

/**
 * Page-local Markdown source editor. Obsidian remains the host/document visual
 * authority; this owner supplies only the embedded CodeMirror editing session.
 */
export function TrailIssueBodyEditor({
  initialValue,
  onCancel,
  onCommit,
}: TrailIssueBodyEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlersRef = useRef({ onCancel, onCommit });
  handlersRef.current = { onCancel, onCommit };

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let finished = false;
    let pointerDownInInspector = false;
    const ownerDocument = host.ownerDocument;
    const handlePointerDown = (event: PointerEvent) => {
      pointerDownInInspector = isInsidePersistentInspector(event.target);
    };
    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);

    const finishCommit = (view: EditorView) => {
      if (finished) return;
      finished = true;
      handlersRef.current.onCommit(view.state.doc.toString());
    };
    const finishCancel = () => {
      if (finished) return;
      finished = true;
      handlersRef.current.onCancel();
    };

    const view = new EditorView({
      doc: initialValue,
      extensions: [
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": "Issue description",
          spellcheck: "true",
        }),
        EditorView.domEventHandlers({
          blur: (event, editor) => {
            const staysInIssueDetail = pointerDownInInspector
              || isInsidePersistentInspector(event.relatedTarget);
            pointerDownInInspector = false;
            if (staysInIssueDetail) return false;
            finishCommit(editor);
            return false;
          },
          keydown: (event, editor) => {
            if (event.key === "Escape") {
              event.preventDefault();
              finishCancel();
              return true;
            }
            if (
              event.key === "Enter"
              && (event.ctrlKey || event.metaKey)
              && !event.repeat
            ) {
              event.preventDefault();
              finishCommit(editor);
              return true;
            }
            return false;
          },
        }),
      ],
      parent: host,
    });
    view.focus();

    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
      finished = true;
      view.destroy();
    };
  }, [initialValue]);

  return (
    <div
      className="trail-issue-full-item__body-editor markdown-source-view mod-cm6"
      ref={hostRef}
    />
  );
}
