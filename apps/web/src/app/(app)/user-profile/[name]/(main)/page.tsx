import { FeedProfileContent } from '../feed-profile-content';

export default async function UserProfileFeedHomePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const accountName = decodeURIComponent(name);
  return <FeedProfileContent accountName={accountName} feedTab="posts" />;
}
