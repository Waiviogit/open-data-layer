import { CategoryNav } from '@/modules/user-profile';

type PageProps = {
  params: Promise<{ name: string }>;
};

export default async function UserShopLeftSidebarPage({ params }: PageProps) {
  const { name } = await params;
  const accountName = decodeURIComponent(name);
  const basePath = `/@${accountName}/user-shop`;

  return (
    <CategoryNav
      accountName={accountName}
      types={['book', 'product']}
      basePath={basePath}
      sectionKey="user-shop"
      lineageSegments={[]}
    />
  );
}
