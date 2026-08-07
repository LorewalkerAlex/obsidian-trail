import type { TrailSourceRange } from "./trail-model";

export interface TrailGuardedMarkdownTarget {
  source: TrailSourceRange;
}

export interface TrailMarkdownRegionEdit {
  startOffset: number;
  endOffset: number;
  replacement: string;
}

export interface TrailGuardedMarkdownEditInput<
  Target extends TrailGuardedMarkdownTarget,
> {
  markdown: string;
  expectedFingerprint: string | undefined;
  missingFingerprintError: () => Error;
  locateLatest: (markdown: string) => Target;
  conflictError: () => Error;
  buildEdit: (
    latestTarget: Target,
    markdown: string,
  ) => TrailMarkdownRegionEdit | undefined;
  verify?: (updatedMarkdown: string) => void;
}

export function applyGuardedMarkdownEdit<
  Target extends TrailGuardedMarkdownTarget,
>({
  markdown,
  expectedFingerprint,
  missingFingerprintError,
  locateLatest,
  conflictError,
  buildEdit,
  verify,
}: TrailGuardedMarkdownEditInput<Target>): string {
  if (expectedFingerprint === undefined) {
    throw missingFingerprintError();
  }

  const latestTarget = locateLatest(markdown);

  if (latestTarget.source.fingerprint !== expectedFingerprint) {
    throw conflictError();
  }

  const edit = buildEdit(latestTarget, markdown);

  if (!edit) {
    return markdown;
  }

  const updatedMarkdown = replaceMarkdownRange(
    markdown,
    edit.startOffset,
    edit.endOffset,
    edit.replacement,
  );

  verify?.(updatedMarkdown);
  return updatedMarkdown;
}

export function replaceMarkdownRange(
  markdown: string,
  startOffset: number,
  endOffset: number,
  replacement: string,
): string {
  if (
    !Number.isInteger(startOffset)
    || !Number.isInteger(endOffset)
    || startOffset < 0
    || endOffset < startOffset
    || endOffset > markdown.length
  ) {
    throw new RangeError("Markdown edit range is invalid.");
  }

  return [
    markdown.slice(0, startOffset),
    replacement,
    markdown.slice(endOffset),
  ].join("");
}
