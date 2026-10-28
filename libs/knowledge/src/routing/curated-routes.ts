export interface CuratedRoute {
  path: string;
  keywords: string[];
  reason: string;
}

/** Static high-confidence routes for common agent intents. */
export const CURATED_ROUTES: CuratedRoute[] = [
  {
    path: 'odl/object-content-routing/SKILL.md',
    keywords: [
      'object create',
      'create recipe',
      'create restaurant',
      'restaurant menu',
      'object create playbook',
      'odl_build_object_create',
    ],
    reason: 'curated:object-create',
  },
  {
    path: 'odl/knowledge-api-routing/SKILL.md',
    keywords: ['knowledge api', 'mcp routing', 'first visit', 'agent onboarding', 'how to use knowledge'],
    reason: 'curated:mcp-routing',
  },
  {
    path: 'odl/setup-workspace/SKILL.md',
    keywords: ['setup workspace', 'sidecar agent', 'clone repo', 'agent workspace'],
    reason: 'curated:agent-workspace',
  },
  {
    path: 'docs/getting-started.md',
    keywords: [
      'local dev',
      'local development',
      'local development environment',
      'docker compose',
      'pnpm nx serve',
      'migrate',
      'how to run the project locally',
      'prepare local development environment',
      'run the project locally',
    ],
    reason: 'curated:local-dev',
  },
  {
    path: 'odl/hive-account-signup/SKILL.md',
    keywords: ['hive account', 'create hive account', 'signup', 'register hive'],
    reason: 'curated:hive-signup',
  },
  {
    path: 'odl/hive-blockchain-broadcast/SKILL.md',
    keywords: ['broadcast', 'custom_json', 'sign transaction', 'dhive', 'blockchain broadcast'],
    reason: 'curated:hive-broadcast',
  },
  {
    path: 'odl/hive-has-agent-wallet/SKILL.md',
    keywords: [
      'has agent wallet',
      'agent wallet',
      'hiveauth agent',
      'has login',
      'sign with has',
      'broadcast without keys',
      'keychain mobile agent',
      'agent-wallet mcp',
    ],
    reason: 'curated:has-agent-wallet',
  },
  {
    path: 'odl/hive-post-create/SKILL.md',
    keywords: [
      'publish post',
      'hive post',
      'create post',
      'waiv reward',
      'post tags',
      'hive_build_post',
      'comment_options',
      'companion post',
    ],
    reason: 'curated:hive-post-create',
  },
  {
    path: 'odl/has-login-from-chat/SKILL.md',
    keywords: [
      'has login telegram',
      'login from chat',
      'keychain from phone',
      'deep link chat',
      'telegram keychain',
      'slack has login',
      'webLink agent wallet',
    ],
    reason: 'curated:has-login-from-chat',
  },
  {
    path: 'odl/obl-offers-contracts/SKILL.md',
    keywords: [
      'sign obl contract',
      'obl contract sign',
      'publish obl offer',
      'obl offer',
      'signParams',
      'obl offers and contracts',
      'contract_sign',
      'buildOblContractSignOp',
    ],
    reason: 'curated:obl-offers-contracts',
  },
  {
    path: 'odl/obl-ledger/SKILL.md',
    keywords: [
      'obl balance',
      'obl pair balance',
      'mutual ledger',
      'issue invoice',
      'obl invoice',
      'obl payment',
      'get_obl_balance',
      'buildOblInvoiceIssueOp',
    ],
    reason: 'curated:obl-ledger',
  },
  {
    path: 'odl/obl-disputes/SKILL.md',
    keywords: [
      'obl dispute',
      'resolve obl dispute',
      'resolve dispute',
      'obl arbitration',
      'dispute_open',
      'buildOblDisputeOpenOp',
      'get_obl_arbitration',
    ],
    reason: 'curated:obl-disputes',
  },
  {
    path: 'odl/build-tenant-site/SKILL.md',
    keywords: [
      'create project',
      'create a project',
      'new project',
      'build project',
      'build site',
      'build tenant site',
      'tenant site',
      'new website',
      'new site',
      'object menu',
      'fork project',
      'custom website',
      'site builder',
      'camping',
      'shop and checklist',
      'html prototype',
      'standalone html',
    ],
    reason: 'curated:build-tenant-site',
  },
  {
    path: 'odl/hive-engine-deposit-for-agents/SKILL.md',
    keywords: [
      'btc deposit',
      'swap.btc',
      'hive engine deposit',
      'deposit instruction',
      'deposit address',
    ],
    reason: 'curated:hive-engine-deposit',
  },
];

export function matchCuratedRoutes(topic: string, scope?: string): Array<CuratedRoute & { confidence: number }> {
  const normalized = topic.toLowerCase();
  const hits: Array<CuratedRoute & { confidence: number }> = [];

  for (const route of CURATED_ROUTES) {
    if (scope && route.path.startsWith(`docs/apps/${scope}/`)) {
      continue;
    }
    let score = 0;
    for (const kw of route.keywords) {
      const needle = kw.toLowerCase();
      if (normalized.includes(needle)) {
        score += needle.split(/\s+/).length;
      }
    }
    if (score > 0) {
      hits.push({ ...route, confidence: Math.min(1, 0.4 + score / 8) });
    }
  }

  return hits.sort((a, b) => b.confidence - a.confidence);
}
