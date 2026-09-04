import { createRef } from "react";
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailButton } from "./trail-button";
import { TrailCheckbox } from "./trail-checkbox";
import { TrailIconButton } from "./trail-icon-button";
import { TrailInput } from "./trail-input";
import { TrailProgress } from "./trail-progress";
import { TrailSeparator } from "./trail-separator";
import { TrailTextarea } from "./trail-textarea";

describe("Trail core primitives", () => {
  it("keeps Button semantics native while exposing only the accepted primary emphasis", () => {
    const onClick = vi.fn();
    render(
      <TrailButton onClick={onClick} variant="primary">
        Create issue
      </TrailButton>,
    );

    const button = screen.getByRole("button", { name: "Create issue" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("trail-button", "trail-button--primary", "mod-cta");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("allows ordinary Button actions and native submit/disabled behavior", () => {
    render(
      <form>
        <TrailButton disabled type="submit">Start cycle</TrailButton>
      </form>,
    );

    const button = screen.getByRole("button", { name: "Start cycle" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("trail-button");
    expect(button).not.toHaveClass("trail-button--primary");
  });

  it("requires IconButton callers to provide an accessible label without owning icon rendering", () => {
    render(
      <TrailIconButton
        icon={<span data-testid="search-icon" />}
        label="Search"
      />,
    );

    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("clickable-icon", "trail-icon-button");
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  it("keeps Checkbox on the native input contract with an explicit accessible label", () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(
      <TrailCheckbox
        label="Select TRAIL-134"
        onChange={onChange}
        ref={ref}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select TRAIL-134" });
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).toHaveClass("trail-checkbox");
    expect(ref.current).toBe(checkbox);

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("forwards Input value, change, type, and ref through the native control", () => {
    const onChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(
      <label>
        Search
        <TrailInput
          onChange={onChange}
          ref={ref}
          type="search"
          value="trail"
        />
      </label>,
    );

    const input = screen.getByRole("searchbox", { name: "Search" });
    expect(input).toHaveClass("trail-input");
    expect(ref.current).toBe(input);

    fireEvent.change(input, { target: { value: "project" } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("forwards Textarea content, disabled state, and ref through the native control", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(
      <label>
        Description
        <TrailTextarea defaultValue="Keep the path obvious." disabled ref={ref} />
      </label>,
    );

    const textarea = screen.getByRole("textbox", { name: "Description" });
    expect(textarea).toHaveClass("trail-textarea");
    expect(textarea).toBeDisabled();
    expect(ref.current).toBe(textarea);
  });

  it("keeps Progress determinate and semantic without owning domain calculation", () => {
    render(<TrailProgress label="Project progress" max={12} value={8} />);

    const progress = screen.getByRole("progressbar", { name: "Project progress" });
    expect(progress).toHaveClass("trail-progress", "trail-progress--normal");
    expect(progress).toHaveAttribute("max", "12");
    expect(progress).toHaveAttribute("value", "8");
    expect(progress).not.toHaveAttribute("aria-valuetext");
  });

  it("supports compact and micro Progress density without changing value semantics", () => {
    const { rerender } = render(
      <TrailProgress density="compact" label="Compact progress" max={12} value={8} />,
    );

    expect(screen.getByRole("progressbar", { name: "Compact progress" })).toHaveClass(
      "trail-progress--compact",
    );

    rerender(
      <TrailProgress density="micro" label="Micro progress" max={12} value={8} />,
    );

    const progress = screen.getByRole("progressbar", { name: "Micro progress" });
    expect(progress).toHaveClass("trail-progress--micro");
    expect(progress).toHaveAttribute("max", "12");
    expect(progress).toHaveAttribute("value", "8");
  });

  it("distinguishes unavailable Progress from a real zero value", () => {
    const { rerender } = render(
      <TrailProgress label="Project progress" max={12} value={0} />,
    );

    const zero = screen.getByRole("progressbar", { name: "Project progress" });
    expect(zero).toHaveAttribute("value", "0");
    expect(zero).not.toHaveClass("trail-progress--unavailable");
    expect(zero).not.toHaveAttribute("aria-valuetext");

    rerender(<TrailProgress label="Project progress" unavailable />);

    const unavailable = screen.getByRole("progressbar", { name: "Project progress" });
    expect(unavailable).toHaveClass("trail-progress--unavailable", "trail-progress--normal");
    expect(unavailable).toHaveAttribute("aria-valuetext", "Unavailable");
    expect(unavailable).toHaveAttribute("data-unavailable", "true");
    expect(unavailable).toHaveAttribute("max", "1");
    expect(unavailable).toHaveAttribute("value", "0");
  });

  it("uses a semantic horizontal Separator without caller-owned styling", () => {
    render(<TrailSeparator />);

    expect(screen.getByRole("separator")).toHaveClass("trail-separator");
  });
});
