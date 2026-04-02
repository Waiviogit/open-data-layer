import { ProfileRouteStub } from '@/modules/user-profile';

type PageProps = {
  params: Promise<{ name: string; objectType: string }>;
};

export default async function UserProfileFavoritesByTypePage({ params }: PageProps) {
  const { objectType } = await params;
  return (
    <ProfileRouteStub
      title={`Favorites — ${objectType}`}
      description="Favorites filtered by object type."
    />
  );
}
