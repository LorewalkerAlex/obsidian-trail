import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../../test/trail-test-fixtures";
import { TrailTriageReviewSurface } from "./trail-triage-review-surface";

describe("TrailTriageReviewSurface", () => {
  it("keeps navigation in the header and disposition actions after the editor body", () => {
    render(
      <TrailTriageReviewSurface
        canNext
        canPrevious
        configuration={createTrailTestConfiguration()}
        draft={{
          description: "Review the current capture before deciding its destination.",
          due: Date.UTC(2026, 8, 12, 4),
          labelIds: ["label-work"],
          priority: "high",
          title: "Review capture",
        }}
        onAccept={vi.fn()}
        onBack={vi.fn()}
        onCommitDraft={vi.fn()}
        onDefer={vi.fn()}
        onDelete={vi.fn()}
        onDescriptionChange={vi.fn()}
        onDueChange={vi.fn()}
        onLabelsChange={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onPriorityChange={vi.fn()}
        onTitleChange={vi.fn()}
        positionLabel="2 / 10"
      />,
    );

    const review = screen.getByRole("region", { name: "Triage review" });
    const header = review.querySelector(".trail-triage-review__header");
    const content = review.querySelector(".trail-triage-review__content");

    expect(header).not.toBeNull();
    expect(content).not.toBeNull();

    const headerScope = within(header as HTMLElement);
    expect(headerScope.getByRole("button", { name: "Previous Triage entry" })).toBeInTheDocument();
    expect(headerScope.getByRole("button", { name: "Next Triage entry" })).toBeInTheDocument();
    expect(headerScope.getByText("2 / 10")).toBeInTheDocument();
    expect(headerScope.queryByRole("button", { name: "Accept Triage entry" })).not.toBeInTheDocument();
    expect(headerScope.queryByRole("button", { name: "Defer Triage entry" })).not.toBeInTheDocument();
    expect(headerScope.queryByRole("button", { name: "Delete Triage entry" })).not.toBeInTheDocument();

    const contentElement = content as HTMLElement;
    const contentScope = within(contentElement);
    expect(contentScope.getByRole("textbox", { name: "Triage title" })).toHaveValue("Review capture");
    expect(contentScope.getByRole("group", { name: "Triage properties" })).toBeInTheDocument();
    expect(contentScope.getByRole("textbox", { name: "Triage description" })).toHaveValue(
      "Review the current capture before deciding its destination.",
    );
    expect(contentScope.getByRole("button", { name: "Accept Triage entry" })).toBeInTheDocument();
    expect(contentScope.getByRole("button", { name: "Defer Triage entry" })).toBeInTheDocument();
    expect(contentScope.getByRole("button", { name: "Delete Triage entry" })).toBeInTheDocument();

    expect(Array.from(contentElement.children).map((element) => element.className)).toEqual([
      "trail-triage-review__title",
      "trail-triage-review__properties",
      "trail-triage-review__description",
      "trail-triage-review__actions",
    ]);
  });

  it("keeps the compact Accept choice menu content-only", () => {
    render(
      <TrailTriageReviewSurface
        canNext
        canPrevious
        configuration={createTrailTestConfiguration()}
        draft={{
          description: "Review the current capture before deciding its destination.",
          due: Date.UTC(2026, 8, 12, 4),
          labelIds: ["label-work"],
          priority: "high",
          title: "Review capture",
        }}
        onAccept={vi.fn()}
        onBack={vi.fn()}
        onCommitDraft={vi.fn()}
        onDefer={vi.fn()}
        onDelete={vi.fn()}
        onDescriptionChange={vi.fn()}
        onDueChange={vi.fn()}
        onLabelsChange={vi.fn()}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onPriorityChange={vi.fn()}
        onTitleChange={vi.fn()}
        positionLabel="2 / 10"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept Triage entry" }));

    expect(screen.queryByText("Accept as")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project" })).toBeInTheDocument();
  });
});
