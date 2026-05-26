import 'server-only';

import { sanitizePostHtml } from '@/shared/infrastructure/sanitize-post-html';

import {
  OBJECT_PAGE_CONTENT_ARTICLE_CLASS,
  OBJECT_PAGE_CONTENT_BODY_CLASS,
} from '../object-page-content-body.class';

export type ObjectPageBodyProps = {
  rawContent: string;
};

/** Server-rendered page body for top-level page-type objects. */
export function ObjectPageBody({ rawContent }: ObjectPageBodyProps) {
  const html = sanitizePostHtml(rawContent);
  return (
    <article className={OBJECT_PAGE_CONTENT_ARTICLE_CLASS}>
      <div
        className={OBJECT_PAGE_CONTENT_BODY_CLASS}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
