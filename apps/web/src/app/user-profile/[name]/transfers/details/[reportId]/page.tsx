import { ProfileRouteStub } from '@/components/user-profile/profile-route-stub';

type PageProps = {
  params: Promise<{ name: string; reportId: string }>;
};

export default async function UserProfileTransfersReportPage({ params }: PageProps) {
  const { reportId } = await params;
  return (
    <ProfileRouteStub
      title={`Report ${reportId}`}
      description="Single transfer report details."
    />
  );
}
