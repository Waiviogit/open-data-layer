import { decodeCategoryPathSegment, ProfileShopMainContent } from '@/modules/user-profile';

type PageProps = {
  params: Promise<{ name: string; categoryPath: string[] }>;
};

export default async function UserProfileRecipeCategoryPage({ params }: PageProps) {
  const { name, categoryPath } = await params;
  const accountName = decodeURIComponent(name);
  const lineageSegments = categoryPath.map(decodeCategoryPathSegment);
  const basePath = `/@${accountName}/recipe`;

  return (
    <ProfileShopMainContent
      accountName={accountName}
      types={['recipe']}
      basePath={basePath}
      lineageSegments={lineageSegments}
    />
  );
}
