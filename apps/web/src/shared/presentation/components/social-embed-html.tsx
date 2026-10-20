'use client';

import { useRef } from 'react';

import { useBindSocialEmbedHeights } from '../hooks/use-bind-social-embed-heights';

export type SocialEmbedHtmlProps = {
  html: string;
  className?: string;
};

/** Sanitized post HTML whose IG / FB / X / LinkedIn iframes resize to content height. */
export function SocialEmbedHtml({ html, className }: SocialEmbedHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  useBindSocialEmbedHeights(ref);
  return (
    <div
      ref={ref}
      suppressHydrationWarning
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
