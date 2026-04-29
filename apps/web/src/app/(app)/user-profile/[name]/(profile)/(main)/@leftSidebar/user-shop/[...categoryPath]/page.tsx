import { CategoryNav, decodeCategoryPathSegment } from '@/modules/user-profile';

type PageProps = {
  params: Promise<{ name: string; categoryPath: string[] }>;
};

export default async function UserShopCategoryLeftSidebarPage({ params }: PageProps) {
  const { name, categoryPath } = await params;
  const accountName = decodeURIComponent(name);
  const lineageSegments = categoryPath.map(decodeCategoryPathSegment);
  const basePath = `/@${accountName}/user-shop`;

  return (
    <CategoryNav
      accountName={accountName}
      types={['book', 'product']}
      basePath={basePath}
      sectionKey="user-shop"
      lineageSegments={lineageSegments}
    />
  );
}
