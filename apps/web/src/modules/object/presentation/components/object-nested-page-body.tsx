'use client';

export type ObjectNestedPageBodyProps = {
  html: string;
};

/** Client-rendered page body for nested page objects (HTML pre-sanitized on server). */
export function ObjectNestedPageBody({ html }: ObjectNestedPageBodyProps) {
  return (
    <article
      className="prose prose-sm max-w-none rounded-card border border-border bg-surface p-card-padding text-fg [&_iframe]:aspect-video [&_iframe]:w-full [&_img]:max-w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
