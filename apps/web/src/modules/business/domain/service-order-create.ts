export function canCreateServiceOrderOnContract(c: {
  offer_status?: 'active' | 'retired';
}): boolean {
  return c.offer_status !== 'retired';
}
