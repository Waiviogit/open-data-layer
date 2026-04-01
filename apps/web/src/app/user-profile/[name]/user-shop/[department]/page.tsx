import { ProfileRouteStub } from '@/components/user-profile/profile-route-stub';

type PageProps = {
  params: Promise<{ name: string; department: string }>;
};

export default async function UserProfileUserShopDepartmentPage({ params }: PageProps) {
  const { department } = await params;
  return (
    <ProfileRouteStub
      title={`Shop — ${department}`}
      description="Department listing within the user shop."
    />
  );
}
