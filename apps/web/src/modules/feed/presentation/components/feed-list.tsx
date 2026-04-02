import type { FeedTab } from '../../domain/feed-tab';
import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import { StoryContainer } from './story-container';

export type FeedListProps = {
  items: FeedStoryView[];
  feedTab: FeedTab;
};

export function FeedList({ items, feedTab }: FeedListProps) {
  return (
    <ul className="flex list-none flex-col gap-card-padding p-0">
      {items.map((story) => (
        <li key={story.id}>
          <StoryContainer story={story} feedTab={feedTab} />
        </li>
      ))}
    </ul>
  );
}
