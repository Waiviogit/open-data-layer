import { notFound } from 'next/navigation';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { BlogPostScreen, getSinglePostQuery } from '@/modules/feed';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { FeedColumn } from '@/shared/presentation/layout';

export default async function UserBlogPostPage({
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
    <FeedColumn>
      <BlogPostScreen
        variant="page"
        story={post.story}
        bodyHtmlSafe={post.bodyHtmlSafe}
        currentUsername={currentUser?.username ?? null}
      />
    </FeedColumn>
  );
}
