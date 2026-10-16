import { AppHeader } from '@/modules/app-header';
import { getUserFeedUnreadCountsQuery } from '@/modules/user-profile/application/queries/get-user-feed-unread-counts.query';
import { getRequestUser } from '@/shared/infrastructure/auth/get-request-user.server';

export async function AppHeaderUser() {
  const current = await getRequestUser();
  const headerUser = current ? { username: current.username } : null;
  const messagesUnreadCount = current
    ? ((await getUserFeedUnreadCountsQuery(current.username, current.username))
        ?.messages ?? 0)
    : 0;
  return (
    <AppHeader user={headerUser} messagesUnreadCount={messagesUnreadCount} />
  );
}
