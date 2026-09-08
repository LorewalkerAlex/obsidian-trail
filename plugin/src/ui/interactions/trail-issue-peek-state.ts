import {
  useCallback,
  useEffect,
  useState,
} from "react";

export type TrailIssuePeekMoveDirection = "next" | "previous";

export function getAdjacentTrailIssueId(
  visibleIssueIds: readonly string[],
  targetId: string,
  direction: TrailIssuePeekMoveDirection,
): string | null {
  const currentIndex = visibleIssueIds.indexOf(targetId);
  if (currentIndex < 0) return null;
  const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  return visibleIssueIds[nextIndex] ?? null;
}

export function isTrailIssuePeekKeyboardOriginEligible(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return target.closest([
    "a",
    "button",
    "input",
    "select",
    "textarea",
    "[contenteditable='true']",
    "[role='combobox']",
    "[role='menuitem']",
    "[role='option']",
  ].join(", ")) === null;
}

export function useTrailIssuePeek(visibleIssueIds: readonly string[]) {
  const [targetId, setTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (targetId !== null && !visibleIssueIds.includes(targetId)) {
      setTargetId(null);
    }
  }, [targetId, visibleIssueIds]);

  const close = useCallback(() => setTargetId(null), []);
  const open = useCallback((issueId: string) => setTargetId(issueId), []);
  const toggle = useCallback((issueId: string) => {
    setTargetId((current) => current === issueId ? null : issueId);
  }, []);
  return {
    close,
    open,
    targetId,
    toggle,
  } as const;
}
