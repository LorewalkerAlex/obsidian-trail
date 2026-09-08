import {
  TrailMarkdownContent,
  type TrailMarkdownRender,
} from "./trail-markdown-content";

export type {
  TrailMarkdownRender,
  TrailMarkdownRenderHandle,
} from "./trail-markdown-content";

export function TrailPageNarrative({
  markdown,
  renderMarkdown,
}: {
  readonly markdown: string;
  readonly renderMarkdown: TrailMarkdownRender;
}) {
  return (
    <div
      className="trail-page-narrative"
      data-trail-page-narrative="true"
    >
      <TrailMarkdownContent
        className="trail-page-narrative__content"
        markdown={markdown}
        renderMarkdown={renderMarkdown}
      />
    </div>
  );
}
