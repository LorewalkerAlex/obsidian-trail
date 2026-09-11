import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  useEffect,
  useRef,
  type RefObject,
} from "react";

import type { TrailWorkflowIssueStatusDragScope } from "./trail-workflow-issue-status-drag";

const TRAIL_STATUS_DRAG_SOURCE = Symbol("trail-workflow-issue-status-drag-source");

interface TrailWorkflowIssueStatusDragSourceData extends Record<string | symbol, unknown> {
  readonly [TRAIL_STATUS_DRAG_SOURCE]: true;
  readonly instanceId: symbol;
  readonly issueIds: readonly string[];
  readonly sourceStatusDefinitionId: string;
  readonly targetStatusDefinitionIds: readonly string[];
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTrailWorkflowIssueStatusDragSourceData(
  data: Record<string | symbol, unknown>,
  instanceId: symbol,
): data is TrailWorkflowIssueStatusDragSourceData {
  return data[TRAIL_STATUS_DRAG_SOURCE] === true
    && data.instanceId === instanceId
    && isStringArray(data.issueIds)
    && typeof data.sourceStatusDefinitionId === "string"
    && isStringArray(data.targetStatusDefinitionIds);
}

function sourceData(
  instanceId: symbol,
  scope: TrailWorkflowIssueStatusDragScope,
): TrailWorkflowIssueStatusDragSourceData {
  return {
    [TRAIL_STATUS_DRAG_SOURCE]: true,
    instanceId,
    issueIds: [...scope.issueIds],
    sourceStatusDefinitionId: scope.sourceStatusDefinitionId,
    targetStatusDefinitionIds: [...scope.targetStatusDefinitionIds],
  };
}

function clearTrailWorkflowIssueStatusDragState(root: HTMLElement): void {
  root.removeAttribute("data-status-drag-active");
  for (const item of root.querySelectorAll<HTMLElement>("[data-status-dragging='true']")) {
    item.removeAttribute("data-status-dragging");
  }
  for (const target of root.querySelectorAll<HTMLElement>("[data-status-drag-over='true']")) {
    target.removeAttribute("data-status-drag-over");
  }
}

function markTrailWorkflowIssueStatusDragScope(
  root: HTMLElement,
  issueIds: readonly string[],
): void {
  const dragged = new Set(issueIds);
  for (const item of root.querySelectorAll<HTMLElement>("[data-workflow-issue-id]")) {
    if (item.dataset.workflowIssueId !== undefined && dragged.has(item.dataset.workflowIssueId)) {
      item.dataset.statusDragging = "true";
    }
  }
  root.dataset.statusDragActive = "true";
}

export function useTrailWorkflowIssueStatusDragPointer(input: {
  readonly enabled: boolean;
  readonly onDrop: (
    scope: TrailWorkflowIssueStatusDragScope,
    targetStatusDefinitionId: string,
  ) => void;
  readonly refreshKey: string;
  readonly resolveScope: (sourceIssueId: string) => TrailWorkflowIssueStatusDragScope | null;
  readonly rootRef: RefObject<HTMLElement | null>;
}): void {
  const instanceIdRef = useRef<symbol>(Symbol("trail-status-drag-instance"));

  useEffect(() => {
    const root = input.rootRef.current;
    if (!input.enabled || root === null) return undefined;

    const instanceId = instanceIdRef.current;
    const cleanups: Array<() => void> = [];

    for (const handle of root.querySelectorAll<HTMLElement>(
      "[data-workflow-issue-drag-handle='true']",
    )) {
      const item = handle.closest<HTMLElement>("[data-workflow-issue-id]");
      const issueId = item?.dataset.workflowIssueId;
      if (item === null || issueId === undefined) continue;

      if (input.resolveScope(issueId) !== null) {
        handle.dataset.statusDragAvailable = "true";
      }
      cleanups.push(() => handle.removeAttribute("data-status-drag-available"));
      cleanups.push(draggable({
        canDrag: () => input.resolveScope(issueId) !== null,
        element: handle,
        getInitialData: () => {
          const scope = input.resolveScope(issueId);
          return scope === null ? {} : sourceData(instanceId, scope);
        },
        onDragStart: ({ source }) => {
          if (!isTrailWorkflowIssueStatusDragSourceData(source.data, instanceId)) return;
          clearTrailWorkflowIssueStatusDragState(root);
          markTrailWorkflowIssueStatusDragScope(root, source.data.issueIds);
          // Native drag does not move DOM focus with the pointer. Keep keyboard
          // ownership on a stable collection surface before optimistic Status
          // projection can remove the previously focused checkbox/card node.
          root.focus({ preventScroll: true });
        },
        onDrop: () => {
          clearTrailWorkflowIssueStatusDragState(root);
        },
      }));
    }

    for (const target of root.querySelectorAll<HTMLElement>(
      "[data-workflow-issue-status-drop-target]",
    )) {
      const targetStatusDefinitionId = target.dataset.workflowIssueStatusDropTarget;
      if (targetStatusDefinitionId === undefined) continue;

      cleanups.push(dropTargetForElements({
        canDrop: ({ source }) => (
          isTrailWorkflowIssueStatusDragSourceData(source.data, instanceId)
          && source.data.targetStatusDefinitionIds.includes(targetStatusDefinitionId)
        ),
        element: target,
        onDragEnter: () => {
          target.dataset.statusDragOver = "true";
        },
        onDragLeave: () => {
          target.removeAttribute("data-status-drag-over");
        },
        onDrop: ({ source }) => {
          target.removeAttribute("data-status-drag-over");
          if (!isTrailWorkflowIssueStatusDragSourceData(source.data, instanceId)) return;
          if (!source.data.targetStatusDefinitionIds.includes(targetStatusDefinitionId)) return;
          input.onDrop({
            issueIds: [...source.data.issueIds],
            sourceStatusDefinitionId: source.data.sourceStatusDefinitionId,
            targetStatusDefinitionIds: [...source.data.targetStatusDefinitionIds],
          }, targetStatusDefinitionId);
        },
      }));
    }

    return () => {
      clearTrailWorkflowIssueStatusDragState(root);
      for (const cleanup of cleanups) cleanup();
    };
  }, [input.enabled, input.onDrop, input.refreshKey, input.resolveScope, input.rootRef]);
}
