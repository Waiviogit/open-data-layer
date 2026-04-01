import { ProfileRouteStub } from '@/components/user-profile/profile-route-stub';

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
