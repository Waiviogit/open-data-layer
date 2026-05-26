import 'server-only';

import { sanitizePostHtml } from '@/shared/infrastructure/sanitize-post-html';

export type ObjectPageBodyProps = {
  rawContent: string;
};

/** Server-rendered page body for top-level page-type objects. */
export function ObjectPageBody({ rawContent }: ObjectPageBodyProps) {
  const html = sanitizePostHtml(rawContent);
  return (
    <article
      className="prose prose-sm max-w-none rounded-card border border-border bg-surface p-card-padding text-fg [&_iframe]:aspect-video [&_iframe]:w-full [&_img]:max-w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
