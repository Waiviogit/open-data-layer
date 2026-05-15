'use client';

import type { ReactNode } from 'react';

import { FeedColumn } from '@/shared/presentation/layout';

import type {
  ObjectFeedSubTabView,
  ObjectSwitcherKind,
} from '../../domain/object-page.types';

import { ObjectFeedSubNav } from './object-feed-sub-nav';
import { ObjectWriteReviewPrompt } from './object-write-review-prompt';

const REVIEWS_SEGMENT = 'reviews';

function stubPrimaryCopy(primarySegment: string): string {
  switch (primarySegment) {
    case 'gallery':
      return 'Gallery';
    case 'updates':
      return 'Updates';
    case 'followers':
      return 'Followers';
    case 'experts':
      return 'Experts';
    default:
      return 'This section';
  }
}

function centerHintForKind(kind: ObjectSwitcherKind): string {
  switch (kind) {
    case 'list':
      return 'Catalog-style layout (mock).';
    case 'page':
      return 'Rich page body (mock).';
    case 'newsfeed':
      return 'News feed preview (mock).';
    case 'widget':
      return 'Embedded widget (mock).';
    case 'webpage':
      return 'Web page (mock).';
    case 'map':
      return 'Map placement (mock).';
    case 'shop':
      return 'Shop departments (mock).';
    case 'group':
      return 'Group workspace (mock).';
    case 'default':
      return 'Reviews and discussions (mock).';
    default: {
      const _e: never = kind;
      return _e;
    }
  }
}

const MOCK_STUB_HINT =
  'Tab content will load here when routes and APIs are connected.';
const MOCK_FEED_POSTS_HINT =
  'Posts list placeholder — replace with Story feed when data is available.';

export type ObjectPrimaryContentProps = {
  objectId: string;
  activePrimarySegment: string;
  activeFeedSubSegment: string;
  feedSubTabs: ObjectFeedSubTabView[];
  title: string;
  objectType: ObjectSwitcherKind;
  onFeedSubSelect: (segment: string) => void;
  /** Injected feed (client) when the Updates tab is active. */
  objectUpdatesFeed?: ReactNode;
};

export function ObjectPrimaryContent({
  objectId,
  activePrimarySegment,
  activeFeedSubSegment,
  feedSubTabs,
  title,
  objectType,
  onFeedSubSelect,
  objectUpdatesFeed,
}: ObjectPrimaryContentProps) {
  if (activePrimarySegment !== REVIEWS_SEGMENT) {
    if (activePrimarySegment === 'updates' && objectUpdatesFeed != null) {
      return (
        <FeedColumn>
          {objectUpdatesFeed}
        </FeedColumn>
      );
    }

    if (activePrimarySegment === 'updates') {
      return (
        <FeedColumn>
          <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
            <p className="font-medium text-fg">{stubPrimaryCopy(activePrimarySegment)}</p>
            <p className="mt-2 text-muted">{MOCK_STUB_HINT}</p>
          </div>
        </FeedColumn>
      );
    }

    return (
      <FeedColumn>
        <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
          <p className="font-medium text-fg">{stubPrimaryCopy(activePrimarySegment)}</p>
          <p className="mt-2 text-muted">{MOCK_STUB_HINT}</p>
        </div>
      </FeedColumn>
    );
  }

  const hint = centerHintForKind(objectType);

  return (
    <FeedColumn>
      <ObjectWriteReviewPrompt />
      {feedSubTabs.length > 0 ? (
        <div className="rounded-card border border-border bg-bg px-card-padding pt-2">
          <ObjectFeedSubNav
            tabs={feedSubTabs}
            activeSegment={activeFeedSubSegment}
            onSelect={onFeedSubSelect}
          />
        </div>
      ) : null}
      <div className="rounded-card border border-border bg-surface/60 p-card-padding text-sm text-muted">
        <p className="text-fg">
          <span className="font-medium">{title}</span>
          {' — '}
          {hint}
        </p>
        <p className="mt-3 text-muted">{MOCK_FEED_POSTS_HINT}</p>
      </div>
    </FeedColumn>
  );
}
