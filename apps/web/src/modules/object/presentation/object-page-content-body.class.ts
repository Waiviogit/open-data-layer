/** Wrapper for sanitized `pageContent` HTML (object page center column). */
export const OBJECT_PAGE_CONTENT_ARTICLE_CLASS =
  'rounded-card border border-border bg-surface p-card-padding';

/**
 * Inner body — mirrors blog post typography and legacy Waivio page tables
 * (logo column + brand link + description row).
 */
export const OBJECT_PAGE_CONTENT_BODY_CLASS = [
  'object-page-content-body',
  'flow-root min-w-0 text-body text-fg leading-body',
  '[&_a]:break-words [&_a]:text-link [&_a]:no-underline hover:[&_a]:underline',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-fg-secondary',
  '[&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-section [&_h1]:font-weight-strong [&_h1]:font-display [&_h1]:text-fg',
  '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-body-lg [&_h2]:font-weight-strong [&_h2]:font-display [&_h2]:text-fg',
  '[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-body-lg [&_h3]:font-weight-strong [&_h3]:font-display [&_h3]:text-fg',
  '[&_p]:mb-4 [&_p]:leading-body [&_p]:text-fg [&_p]:empty:hidden',
  '[&_strong]:font-weight-strong [&_strong]:text-fg',
  '[&_br]:block [&_br]:content-[""] [&_br]:mt-3',
  '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:mb-1',
  '[&_iframe]:aspect-video [&_iframe]:my-4 [&_iframe]:w-full',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-code-bg [&_pre]:p-3',
].join(' ');
