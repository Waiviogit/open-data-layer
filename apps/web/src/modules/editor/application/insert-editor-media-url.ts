import { $createLinkNode } from '@lexical/link';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from 'lexical';

import {
  canonicalizeMediaUrl,
  parseMediaEmbedUrl,
} from '@/shared/infrastructure/media-embed';

/**
 * Inserts a media URL as its own linked paragraph.
 * Stored markdown is the public URL; render-time pipeline turns it into an iframe.
 */
export function insertMediaUrlAtSelection(
  editor: LexicalEditor,
  url: string,
): boolean {
  if (!parseMediaEmbedUrl(url)) {
    return false;
  }
  const href = canonicalizeMediaUrl(url);

  editor.update(() => {
    const paragraph = $createParagraphNode();
    const linkNode = $createLinkNode(href);
    linkNode.append($createTextNode(href));
    paragraph.append(linkNode);

    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.insertNodes([paragraph]);
    } else {
      $getRoot().append(paragraph);
    }

    if (!paragraph.getNextSibling()) {
      const next = $createParagraphNode();
      paragraph.insertAfter(next);
      next.selectStart();
    }
  });

  return true;
}
