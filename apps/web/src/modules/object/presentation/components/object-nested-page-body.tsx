'use client';

import {
  OBJECT_PAGE_CONTENT_ARTICLE_CLASS,
  OBJECT_PAGE_CONTENT_BODY_CLASS,
} from '../object-page-content-body.class';

export type ObjectNestedPageBodyProps = {
  html: string;
};

/** Client-rendered page body for nested page objects (HTML pre-sanitized on server). */
export function ObjectNestedPageBody({ html }: ObjectNestedPageBodyProps) {
  return (
    <article className={OBJECT_PAGE_CONTENT_ARTICLE_CLASS}>
      {/* suppressHydrationWarning: browser may normalize serialized HTML vs prop string. */}
      <div
        suppressHydrationWarning
        className={OBJECT_PAGE_CONTENT_BODY_CLASS}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
