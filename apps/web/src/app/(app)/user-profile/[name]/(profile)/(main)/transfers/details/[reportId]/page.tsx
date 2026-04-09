import { ProfileRouteStub } from '@/modules/user-profile';

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
