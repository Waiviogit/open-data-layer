import { notFound } from 'next/navigation';

import { BusinessServiceOrderClient } from '@/modules/business';
import { fetchOblServiceOrder } from '@/modules/business/infrastructure/clients/obl-ledger.server';
import { requireBusinessUser } from '@/modules/business/infrastructure/require-business-user.server';

export default async function BusinessServiceOrderPage({
  params,
}: {
  params: Promise<{ serviceOrderId: string }>;
}) {
  const { username } = await requireBusinessUser();
  const { serviceOrderId } = await params;
  const detail = await fetchOblServiceOrder(decodeURIComponent(serviceOrderId));
  if (!detail) {
    notFound();
  }
  return <BusinessServiceOrderClient username={username} detail={detail} />;
}
