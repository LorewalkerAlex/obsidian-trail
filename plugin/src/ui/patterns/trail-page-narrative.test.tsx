import {
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TrailPageNarrative,
  type TrailMarkdownRender,
} from "./trail-page-narrative";

function createRenderer(dispose = vi.fn()) {
  const renderMarkdown = vi.fn<TrailMarkdownRender>((markdown, container) => {
    container.textContent = `Rendered: ${markdown}`;
    return {
      completion: Promise.resolve(),
      dispose,
    };
  });
  return { dispose, renderMarkdown };
}

describe("TrailPageNarrative", () => {
  it("delegates Markdown rendering to the injected host capability", async () => {
    const { renderMarkdown } = createRenderer();

    render(
      <TrailPageNarrative
        markdown="A **lightweight** description."
        renderMarkdown={renderMarkdown}
      />,
    );

    expect(await screen.findByText("Rendered: A **lightweight** description."))
      .toBeInTheDocument();
    expect(renderMarkdown).toHaveBeenCalledTimes(1);
    expect(renderMarkdown.mock.calls[0]?.[0]).toBe("A **lightweight** description.");
    expect(renderMarkdown.mock.calls[0]?.[1])
      .toHaveClass("trail-page-narrative__content");
  });

  it("disposes the previous host render immediately when content changes and on unmount", async () => {
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();
    let invocation = 0;
    const renderMarkdown = vi.fn<TrailMarkdownRender>((markdown, container) => {
      invocation += 1;
      container.textContent = markdown;
      return {
        completion: Promise.resolve(),
        dispose: invocation === 1 ? firstDispose : secondDispose,
      };
    });
    const { rerender, unmount } = render(
      <TrailPageNarrative markdown="First" renderMarkdown={renderMarkdown} />,
    );
    await screen.findByText("First");

    rerender(<TrailPageNarrative markdown="Second" renderMarkdown={renderMarkdown} />);
    await screen.findByText("Second");
    await waitFor(() => expect(firstDispose).toHaveBeenCalledTimes(1));

    unmount();
    expect(secondDispose).toHaveBeenCalledTimes(1);
  });
});
