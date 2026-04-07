'use client';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';

import { StoryPreviewTile } from './story-preview-tile';

export type FeedPostGridProps = {
  items: FeedStoryView[];
};

/**
 * Dense square preview grid for profile posts (Instagram shell mode).
 * Column ramp and gap are defined in `theme.css` (`.instagram-post-grid`) so
 * counts follow the main column width with sidebars hidden.
 */
export function FeedPostGrid({ items }: FeedPostGridProps) {
  return (
    <div className="instagram-post-grid">
      {items.map((story) => (
        <StoryPreviewTile key={story.id} story={story} />
      ))}
    </div>
  );
}
