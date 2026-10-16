'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { consumeMarkProfileFeedRead } from './consume-mark-profile-feed-read';
import { getSegmentsAfterAccount } from './profile-path';
import { markProfileFeedReadAction } from '../../infrastructure/feed-unread.actions';

function feedTabFromRest(rest: string[]): 'posts' | 'threads' | 'messages' | null {
  const head = rest[0] ?? '';
  if (head === '' || head === 'posts') {
    return 'posts';
  }
  if (head === 'threads') {
    return 'threads';
  }
  if (head === 'messages') {
    return 'messages';
  }
  return null;
}

export function ProfileFeedTabMarkReadEffect({
  accountName,
  viewerUsername,
}: {
  accountName: string;
  viewerUsername: string | null;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const viewer = viewerUsername?.trim() ?? '';
    if (!viewer || viewer.toLowerCase() !== accountName.trim().toLowerCase()) {
      return;
    }
    const rest = getSegmentsAfterAccount(pathname);
    const tab = feedTabFromRest(rest);
    if (!tab || tab === 'messages' || !consumeMarkProfileFeedRead(accountName, tab)) {
      return;
    }
    void markProfileFeedReadAction(accountName, tab);
  }, [accountName, pathname, viewerUsername]);

  return null;
}
