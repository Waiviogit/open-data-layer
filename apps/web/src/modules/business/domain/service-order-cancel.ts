export function serviceOrderStatus(
  so: { status?: 'active' | 'cancelled' },
): 'active' | 'cancelled' {
  return so.status === 'cancelled' ? 'cancelled' : 'active';
}

export function canCancelServiceOrder(
  so: { status?: 'active' | 'cancelled'; provider: string; client: string },
  viewer: string,
): boolean {
  return (
    serviceOrderStatus(so) === 'active' &&
    (so.provider === viewer || so.client === viewer)
  );
}

export function isCancelledServiceOrderId(
  serviceOrderId: string,
  orders: ReadonlyArray<{ service_order_id: string; status?: string }>,
): boolean {
  const id = serviceOrderId.trim();
  if (!id) {
    return false;
  }
  return orders.some(
    (so) => so.service_order_id === id && so.status === 'cancelled',
  );
}
