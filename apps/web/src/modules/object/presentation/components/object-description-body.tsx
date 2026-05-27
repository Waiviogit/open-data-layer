import 'server-only';

import Image from 'next/image';

import { sanitizePostHtml } from '@/shared/infrastructure/sanitize-post-html';
import { shouldUnoptimizeRemoteImage } from '@/shared/presentation';

import {
  buildDescriptionPageBlocks,
  splitDescriptionParagraphs,
} from '../../domain/build-description-page-blocks';
import type { ProjectedGalleryPhotoView } from '../../domain/object-page.types';
import {
  OBJECT_PAGE_CONTENT_ARTICLE_CLASS,
  OBJECT_PAGE_CONTENT_BODY_CLASS,
} from '../object-page-content-body.class';

export type ObjectDescriptionBodyProps = {
  descriptionContent: string | null;
  galleryPhotos: ProjectedGalleryPhotoView[];
};

/** Server-rendered description page with legacy paragraph/photo interleave. */
export function ObjectDescriptionBody({
  descriptionContent,
  galleryPhotos,
}: ObjectDescriptionBodyProps) {
  const paragraphs = descriptionContent
    ? splitDescriptionParagraphs(descriptionContent)
    : [];
  const blocks = buildDescriptionPageBlocks(paragraphs, galleryPhotos);

  if (blocks.length === 0) {
    return (
      <article className={OBJECT_PAGE_CONTENT_ARTICLE_CLASS}>
        <p className="text-sm text-muted">This object has no description yet.</p>
      </article>
    );
  }

  return (
    <article className={OBJECT_PAGE_CONTENT_ARTICLE_CLASS}>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          const html = sanitizePostHtml(block.html);
          return (
            <div
              key={`p-${index}`}
              className={OBJECT_PAGE_CONTENT_BODY_CLASS}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return (
          <div
            key={`img-${block.url}-${index}`}
            className="relative my-4 aspect-[4/3] w-full overflow-hidden rounded-btn border border-border"
          >
            <Image
              src={block.url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              unoptimized={shouldUnoptimizeRemoteImage(block.url)}
            />
          </div>
        );
      })}
    </article>
  );
}
