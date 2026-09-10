import {
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";

describe("TrailProjectProductionSpecimens Issue Peek", () => {
  it("shows rich and sparse states through the production Peek owner with the Full Item path", () => {
    render(<TrailProjectProductionSpecimens />);

    const gallery = within(screen.getByRole("group", { name: "Workflow Issue Peek" }));
    expect(gallery.getByRole("complementary", {
      name: "Issue peek: Calibrate the read-only Issue Peek surface",
    })).toBeInTheDocument();
    expect(gallery.getByRole("complementary", {
      name: "Issue peek: Keep absent optional detail quiet",
    })).toBeInTheDocument();
    expect(gallery.getAllByRole("button", { name: "Open full item" })).toHaveLength(2);
  });
});
