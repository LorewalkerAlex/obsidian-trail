import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TrailMarkdownContent,
  type TrailMarkdownRender,
} from "./trail-markdown-content";

describe("TrailMarkdownContent", () => {
  it("owns one reusable host-render lifecycle for read-only Markdown surfaces", async () => {
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();
    let invocation = 0;
    const renderMarkdown = vi.fn<TrailMarkdownRender>((markdown, container) => {
      invocation += 1;
      container.textContent = `Rendered: ${markdown}`;
      return {
        completion: Promise.resolve(),
        dispose: invocation === 1 ? firstDispose : secondDispose,
      };
    });
    const { rerender, unmount } = render(
      <TrailMarkdownContent
        className="test-markdown"
        markdown="First"
        renderMarkdown={renderMarkdown}
      />,
    );

    expect(await screen.findByText("Rendered: First")).toHaveClass("test-markdown");
    rerender(
      <TrailMarkdownContent
        className="test-markdown"
        markdown="Second"
        renderMarkdown={renderMarkdown}
      />,
    );
    expect(await screen.findByText("Rendered: Second")).toBeInTheDocument();
    await waitFor(() => expect(firstDispose).toHaveBeenCalledTimes(1));

    unmount();
    expect(secondDispose).toHaveBeenCalledTimes(1);
  });
});
