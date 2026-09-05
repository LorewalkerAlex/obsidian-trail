import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailStandardComposerFamilySpecimen } from "./trail-standard-composer-family-specimen";

describe("TrailStandardComposerFamilySpecimen", () => {
  it("embeds the three production Composer surfaces without invoking modal behavior", () => {
    render(<TrailStandardComposerFamilySpecimen />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const triage = screen.getByRole("region", { name: "triage composer preview" });
    const issue = screen.getByRole("region", { name: "issue composer preview" });
    const project = screen.getByRole("region", { name: "project composer preview" });

    expect(within(triage).getByText("Triage")).toBeInTheDocument();
    expect(within(issue).getByText("Issue · Standalone")).toBeInTheDocument();
    expect(within(project).getByText("Project")).toBeInTheDocument();

    expect(within(issue).queryByText("Required")).not.toBeInTheDocument();
    const projectRelation = within(issue).getByRole("button", { name: "Project: Standalone" });
    expect(projectRelation).toBeInTheDocument();
    expect(projectRelation.closest(".trail-standard-composer-form__relation"))
      .toHaveAttribute("data-required", "true");
    expect(within(issue).getByRole("combobox", { name: "Priority: Medium" })).toBeInTheDocument();
    expect(within(project).getByRole("button", { name: "Initiative: No initiative" })).toBeInTheDocument();
  });
});
