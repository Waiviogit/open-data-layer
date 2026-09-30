import { canCreateServiceOrderOnContract } from './service-order-create';

describe('canCreateServiceOrderOnContract', () => {
  it('keeps contracts with an active offer', () => {
    expect(canCreateServiceOrderOnContract({ offer_status: 'active' })).toBe(true);
  });

  it('drops contracts whose offer is retired', () => {
    expect(canCreateServiceOrderOnContract({ offer_status: 'retired' })).toBe(false);
  });

  it('keeps contracts when offer_status is omitted', () => {
    expect(canCreateServiceOrderOnContract({})).toBe(true);
  });
});
