import { decodeCategoryPathSegment, ProfileShopMainContent } from '@/modules/user-profile';

type PageProps = {
  params: Promise<{ name: string; categoryPath: string[] }>;
};

export default async function UserProfileUserShopCategoryPage({ params }: PageProps) {
  const { name, categoryPath } = await params;
  const accountName = decodeURIComponent(name);
  const lineageSegments = categoryPath.map(decodeCategoryPathSegment);
  const basePath = `/@${accountName}/user-shop`;

  return (
    <ProfileShopMainContent
      accountName={accountName}
      types={['book', 'product']}
      basePath={basePath}
      lineageSegments={lineageSegments}
    />
  );
}
