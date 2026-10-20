/**
 * @jest-environment jsdom
 */
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('@/i18n/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en-US',
  }),
}));

jest.mock('@/modules/auth', () => ({
  useLoginModal: () => ({ openLogin: jest.fn() }),
}));

jest.mock('@/shared/presentation', () => ({
  SocialEmbedHtml: () => null,
  StatHoverTooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  UserAvatar: ({ username }: { username: string }) => (
    <span data-testid={`avatar-${username}`}>{username}</span>
  ),
}));

jest.mock('./story-utils', () => ({
  formatRelativeFeedTime: () => '1h',
  formatReputation: () => null,
}));

jest.mock('./linked-objects-section', () => ({
  LinkedObjectsSection: () => null,
}));

jest.mock('./story-comments-section', () => ({
  StoryCommentsSection: () => null,
}));

jest.mock('./story-overflow-menu', () => ({
  StoryOverflowMenu: () => null,
}));

jest.mock('./story-reblog-button', () => ({
  StoryReblogButton: () => null,
}));

jest.mock('./story-stat-button', () => ({
  StoryStatButton: () => null,
}));

jest.mock('./story-vote-button', () => ({
  StoryVoteButton: () => null,
}));

jest.mock('./story-comment-editor', () => ({
  StoryCommentEditor: () => null,
}));

jest.mock('./story-reward-badge', () => ({
  StoryRewardBadge: () => null,
}));

import { BlogPostScreen } from './blog-post-screen';

const story: FeedStoryView = {
  id: 'foodster/bechamel',
  authorName: 'foodster',
  authorDisplayName: 'Foodster',
  permlink: 'bechamel',
  createdAt: '2026-05-19T10:00:00.000Z',
  excerpt: 'Sauce.',
  title: 'Bechamel',
  rebloggedByViewer: false,
  waivRewardEligible: false,
};

function renderScreen(variant: 'page' | 'modal' = 'page') {
  return render(
    <BlogPostScreen
      variant={variant}
      story={story}
      bodyHtmlSafe="<p>Sauce.</p>"
      currentUsername={null}
    />,
  );
}

describe('BlogPostScreen author links', () => {
  it('links avatar and display name to the author profile on the page variant', () => {
    renderScreen('page');

    const avatarLink = screen.getByRole('link', { name: 'View profile: @foodster' });
    expect(avatarLink).toHaveAttribute('href', '/@foodster');

    const nameLink = screen.getByRole('link', { name: 'Foodster' });
    expect(nameLink).toHaveAttribute('href', '/@foodster');
  });

  it('links avatar and display name to the author profile on the modal variant', () => {
    renderScreen('modal');

    const avatarLink = screen.getByRole('link', { name: 'View profile: @foodster' });
    expect(avatarLink).toHaveAttribute('href', '/@foodster');

    const nameLink = screen.getByRole('link', { name: 'Foodster' });
    expect(nameLink).toHaveAttribute('href', '/@foodster');
  });
});
