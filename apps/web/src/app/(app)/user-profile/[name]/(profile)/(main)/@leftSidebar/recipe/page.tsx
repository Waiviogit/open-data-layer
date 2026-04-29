import { CategoryNav } from '@/modules/user-profile';

type PageProps = {
  params: Promise<{ name: string }>;
};

export default async function RecipeLeftSidebarPage({ params }: PageProps) {
  const { name } = await params;
  const accountName = decodeURIComponent(name);
  const basePath = `/@${accountName}/recipe`;

  return (
    <CategoryNav
      accountName={accountName}
      types={['recipe']}
      basePath={basePath}
      sectionKey="recipe"
      lineageSegments={[]}
    />
  );
}
