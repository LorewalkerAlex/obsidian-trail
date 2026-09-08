import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getAdjacentTrailIssueId,
  useTrailIssuePeek,
} from "./trail-issue-peek-state";

describe("Issue Peek state", () => {
  it("uses only the current visible ordered collection for adjacent targets", () => {
    const ids = ["issue-a", "issue-b", "issue-c"];

    expect(getAdjacentTrailIssueId(ids, "issue-b", "previous")).toBe("issue-a");
    expect(getAdjacentTrailIssueId(ids, "issue-b", "next")).toBe("issue-c");
    expect(getAdjacentTrailIssueId(ids, "issue-a", "previous")).toBeNull();
    expect(getAdjacentTrailIssueId(ids, "missing", "next")).toBeNull();
  });

  it("closes rather than guessing a successor when the target leaves the visible projection", async () => {
    const { result, rerender } = renderHook(
      ({ ids }: { readonly ids: readonly string[] }) => useTrailIssuePeek(ids),
      { initialProps: { ids: ["issue-a", "issue-b"] } },
    );

    act(() => result.current.open("issue-b"));
    expect(result.current.targetId).toBe("issue-b");

    rerender({ ids: ["issue-a"] });
    await waitFor(() => expect(result.current.targetId).toBeNull());
  });
});
