import type { FeedTab } from '../../domain/feed-tab';
import type { FeedStoryView } from '../../application/dto/feed-story.dto';
import { Story } from './story';

export type StoryContainerProps = {
  story: FeedStoryView;
  feedTab?: FeedTab;
};

/**
 * Thin container: maps feed context onto {@link Story}. No client store — data comes from the server.
 */
export function StoryContainer({ story, feedTab }: StoryContainerProps) {
  return <Story story={story} feedTab={feedTab} />;
}
