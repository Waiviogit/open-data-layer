import { notFound } from 'next/navigation';

import { BlogPostScreen, getSinglePostQuery, PostInterceptModalShell } from '@/modules/feed';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { FeedColumn } from '@/shared/presentation/layout';

/**
 * Intercepts soft navigation from any page to `/user-profile/[name]/[permlink]`.
 * Using `(...)` (from the app root) so the marker segment is `(...)user-profile` — a static
 * string — rather than `(.)` applied to a dynamic `[permlink]`, which causes Next to split
 * the actual permlink value on every `(.)` occurrence.
 * Hard navigation renders `(article)/[permlink]/page.tsx` full-page.
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
  const post = await getSinglePostQuery(accountName, permlinkDecoded, locale);
  if (!post) {
    notFound();
  }
  const auth = createCookieAuthContextProvider();
  const currentUser = await auth.getUser();

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
