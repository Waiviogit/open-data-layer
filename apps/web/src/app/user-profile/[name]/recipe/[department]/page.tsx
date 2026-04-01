import { ProfileRouteStub } from '@/components/user-profile/profile-route-stub';

type PageProps = {
  params: Promise<{ name: string; department: string }>;
};

export default async function UserProfileRecipeDepartmentPage({ params }: PageProps) {
  const { department } = await params;
  return (
    <ProfileRouteStub
      title={`Recipe — ${department}`}
      description="Recipe content for the selected department."
    />
  );
}
