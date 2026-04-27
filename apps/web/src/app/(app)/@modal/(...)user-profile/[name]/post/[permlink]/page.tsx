import { notFound } from 'next/navigation';

import { BlogPostScreen, getSinglePostQuery, PostInterceptModalShell } from '@/modules/feed';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { FeedColumn } from '@/shared/presentation/layout';

/**
 * Intercepts soft navigation to `/user-profile/[name]/post/[permlink]`.
 * Posts live under a static `post` segment so profile tabs (`threads`, etc.) are not mistaken
 * for permalinks by this parallel route (which would load getSinglePostQuery and 404).
 *
 * Public URLs stay `/@account/permlink`; {@link proxy} rewrites them to `.../post/permlink`.
 */
export default async function PostModalInterceptPage({
  params,
}: {
  params: Promise<{ name: string; permlink: string }>;
}) {
  const { name, permlink } = await params;
  const accountName = decodeURIComponent(name);
  const permlinkDecoded = decodeURIComponent(permlink);
  const locale = await getRequestLocale();
  const auth = createCookieAuthContextProvider();
  const currentUser = await auth.getUser();
  const post = await getSinglePostQuery(
    accountName,
    permlinkDecoded,
    locale,
    currentUser?.username ?? null,
  );
  if (!post) {
    notFound();
  }

  return (
    <PostInterceptModalShell>
      <FeedColumn>
        <BlogPostScreen
          variant="modal"
          story={post.story}
          bodyHtmlSafe={post.bodyHtmlSafe}
          currentUsername={currentUser?.username ?? null}
        />
      </FeedColumn>
    </PostInterceptModalShell>
  );
}
