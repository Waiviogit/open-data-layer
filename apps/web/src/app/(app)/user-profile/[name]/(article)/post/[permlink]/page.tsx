import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import {
  BlogPostScreen,
  getSinglePostQuery,
} from '@/modules/feed';
import {
  buildArticleJsonLd,
  buildPostMetadata,
  JsonLdScript,
  postCanonical,
  seoPublicOrigin,
} from '@/seo';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';
import { FeedColumn } from '@/shared/presentation/layout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; permlink: string }>;
}): Promise<Metadata> {
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
    return { title: `${accountName}/${permlinkDecoded}` };
  }
  return buildPostMetadata({
    authorName: post.story.authorName,
    permlink: post.story.permlink,
    title: post.story.title ?? null,
    excerpt: post.story.excerpt,
    thumbnailUrl: post.story.thumbnailUrl ?? null,
    videoThumbnailUrl: post.story.videoThumbnailUrl ?? null,
    authorDisplayName: post.story.authorDisplayName ?? null,
    authorAvatarUrl: post.story.authorAvatarUrl ?? null,
    createdAt: post.story.createdAt,
    permalinkPath: post.story.permalinkPath ?? `/@${accountName}/${permlinkDecoded}`,
  });
}

export default async function UserBlogPostPage({
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

  const origin = seoPublicOrigin();
  const canonical = origin
    ? postCanonical(
        origin,
        post.story.permalinkPath ?? `/@${accountName}/${permlinkDecoded}`,
      )
    : '';
  const jsonLd = buildArticleJsonLd(
    {
      authorName: post.story.authorName,
      permlink: post.story.permlink,
      title: post.story.title ?? null,
      excerpt: post.story.excerpt,
      thumbnailUrl: post.story.thumbnailUrl ?? null,
      videoThumbnailUrl: post.story.videoThumbnailUrl ?? null,
      authorDisplayName: post.story.authorDisplayName ?? null,
      authorAvatarUrl: post.story.authorAvatarUrl ?? null,
      createdAt: post.story.createdAt,
      permalinkPath: post.story.permalinkPath ?? `/@${accountName}/${permlinkDecoded}`,
    },
    canonical,
  );

  return (
    <FeedColumn>
      <JsonLdScript data={jsonLd} />
      <BlogPostScreen
        variant="page"
        story={post.story}
        bodyHtmlSafe={post.bodyHtmlSafe}
        currentUsername={currentUser?.username ?? null}
      />
    </FeedColumn>
  );
}
