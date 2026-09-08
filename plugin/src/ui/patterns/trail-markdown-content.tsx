import {
  useEffect,
  useRef,
} from "react";

export interface TrailMarkdownRenderHandle {
  readonly completion: Promise<void>;
  readonly dispose: () => void;
}

export type TrailMarkdownRender = (
  markdown: string,
  container: HTMLElement,
) => TrailMarkdownRenderHandle;

export function TrailMarkdownContent({
  className,
  markdown,
  renderMarkdown,
}: {
  readonly className?: string;
  readonly markdown: string;
  readonly renderMarkdown: TrailMarkdownRender;
}) {
  const renderTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderTarget = renderTargetRef.current;
    if (renderTarget === null) return;

    let disposed = false;
    renderTarget.replaceChildren();
    const rendered = renderMarkdown(markdown, renderTarget);

    void rendered.completion.catch(() => {
      if (!disposed) renderTarget.textContent = markdown;
    });

    return () => {
      disposed = true;
      rendered.dispose();
      renderTarget.replaceChildren();
    };
  }, [markdown, renderMarkdown]);

  return <div className={className} ref={renderTargetRef} />;
}
