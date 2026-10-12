import { matchCuratedRoutes } from './curated-routes';

describe('curated-routes', () => {
  it('matches knowledge api routing intent', () => {
    const hits = matchCuratedRoutes('how to use knowledge mcp');
    expect(hits[0]?.path).toBe('docs/skills/knowledge-api-routing.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches hive signup intent', () => {
    const hits = matchCuratedRoutes('create hive account');
    expect(hits.some((h) => h.path === 'docs/skills/hive-account-signup.md')).toBe(true);
  });

  it('matches build tenant site intent', () => {
    const hits = matchCuratedRoutes('build tenant site');
    expect(hits[0]?.path).toBe('docs/skills/build-tenant-site.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches create project intent', () => {
    const hits = matchCuratedRoutes("let's create a project");
    expect(hits[0]?.path).toBe('docs/skills/build-tenant-site.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches OBL offers/contracts intent', () => {
    const hits = matchCuratedRoutes('sign obl contract');
    expect(hits[0]?.path).toBe('docs/skills/obl-offers-contracts.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches OBL ledger intent', () => {
    const hits = matchCuratedRoutes('obl pair balance');
    expect(hits[0]?.path).toBe('docs/skills/obl-ledger.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches OBL disputes intent', () => {
    const hits = matchCuratedRoutes('resolve obl dispute');
    expect(hits[0]?.path).toBe('docs/skills/obl-disputes.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });

  it('matches hive engine deposit intent', () => {
    const hits = matchCuratedRoutes('btc deposit swap.btc');
    expect(hits[0]?.path).toBe('docs/skills/hive-engine-deposit-for-agents.md');
    expect(hits[0]?.confidence).toBeGreaterThan(0);
  });
});
