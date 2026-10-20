'use client';

import { useLayoutEffect, type RefObject } from 'react';

import {
  applySocialEmbedFrameHeight,
  isSocialEmbedResizeOrigin,
  parseSocialEmbedHeight,
} from '@/shared/infrastructure/social-embed-height';

/** Grow IG / FB / X / LinkedIn iframes to the height they post, so the card does not scroll inside. */
export function useBindSocialEmbedHeights(
  containerRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isSocialEmbedResizeOrigin(event.origin)) {
        return;
      }
      const height = parseSocialEmbedHeight(event.data);
      if (height == null) {
        return;
      }
      const root = containerRef.current;
      if (!root) {
        return;
      }
      const iframes = root.querySelectorAll('iframe');
      for (const iframe of iframes) {
        if (event.source === iframe.contentWindow) {
          applySocialEmbedFrameHeight(iframe, height);
          break;
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [containerRef]);
}
