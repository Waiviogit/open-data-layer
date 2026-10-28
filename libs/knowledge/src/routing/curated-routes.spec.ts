import { matchCuratedRoutes } from './curated-routes';

describe('curated-routes', () => {
  it('matches knowledge api routing intent', () => {
    const hits = matchCuratedRoutes('how to use knowledge mcp');
    expect(hits[0]?.path).toBe('odl/knowledge-api-routing/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches hive signup intent', () => {
    const hits = matchCuratedRoutes('create hive account');
    expect(hits.some((h) => h.path === 'odl/hive-account-signup/SKILL.md')).toBe(true);
  });

  it('matches build tenant site intent', () => {
    const hits = matchCuratedRoutes('build tenant site');
    expect(hits[0]?.path).toBe('odl/build-tenant-site/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches create project intent', () => {
    const hits = matchCuratedRoutes("let's create a project");
    expect(hits[0]?.path).toBe('odl/build-tenant-site/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches OBL offers/contracts intent', () => {
    const hits = matchCuratedRoutes('sign obl contract');
    expect(hits[0]?.path).toBe('odl/obl-offers-contracts/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches OBL ledger intent', () => {
    const hits = matchCuratedRoutes('obl pair balance');
    expect(hits[0]?.path).toBe('odl/obl-ledger/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches OBL disputes intent', () => {
    const hits = matchCuratedRoutes('resolve obl dispute');
    expect(hits[0]?.path).toBe('odl/obl-disputes/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches hive engine deposit intent', () => {
    const hits = matchCuratedRoutes('btc deposit swap.btc');
    expect(hits[0]?.path).toBe('odl/hive-engine-deposit-for-agents/SKILL.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });
});
