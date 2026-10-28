export const PATHS = {
  knowledgeRouting: 'odl/knowledge-api-routing/SKILL.md',
  hiveSignup: 'odl/hive-account-signup/SKILL.md',
  hiveBroadcast: 'odl/hive-blockchain-broadcast/SKILL.md',
  agentWorkspace: 'odl/setup-workspace/SKILL.md',
  localDev: 'docs/getting-started.md',
  oblOffersContracts: 'odl/obl-offers-contracts/SKILL.md',
  oblLedger: 'odl/obl-ledger/SKILL.md',
  oblDisputes: 'odl/obl-disputes/SKILL.md',
  objectContentRouting: 'odl/object-content-routing/SKILL.md',
  objectContentStandards: 'odl/object-content-standards/SKILL.md',
  restaurantMenuWorkflow: 'odl/restaurant-menu-workflow/SKILL.md',
  companionPostWorkflow: 'odl/companion-post-workflow/SKILL.md',
  recipePlaybook: 'odl/object-create/references/recipe.md',
} as const;

export const ALL_SKILL_PATHS = [
  PATHS.knowledgeRouting,
  PATHS.hiveSignup,
  PATHS.hiveBroadcast,
  PATHS.agentWorkspace,
  PATHS.oblOffersContracts,
  PATHS.oblLedger,
  PATHS.oblDisputes,
  PATHS.objectContentRouting,
  PATHS.objectContentStandards,
  PATHS.restaurantMenuWorkflow,
  PATHS.companionPostWorkflow,
] as const;

export interface SearchResult {
  file_path: string;
  title: string;
  description: string | null;
  heading: string | null;
  score: number;
  content: string;
  tags: string[];
  type: string;
}

export interface SearchKnowledgeResponse {
  results: SearchResult[];
}

export interface GetFileResponse {
  path: string;
  moved_from?: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  tags: string[];
  body: string;
}

export interface ListFilesResponse {
  files: {
    path: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    scope: string;
    tags: string[];
  }[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetContextResponse {
  routes: { path: string; confidence: number; reason: string }[];
  results: SearchResult[];
}

export interface ResolveDocResponse {
  routes: {
    path: string;
    title: string;
    description: string | null;
    confidence: number;
    reason: string;
  }[];
  topConfidence: number;
}

export const CORE_MCP_TOOLS = [
  'search_knowledge',
  'resolve_doc',
  'get_file',
  'get_context',
  'list_files',
  'list_tags',
  'get_object_create_playbook',
] as const;

export const APP_SPEC_DISCOVERY_QUERIES = [
  {
    query: 'chain indexer vote ingestion',
    expectedPath: 'docs/apps/chain-indexer/spec/vote-ingestion.md',
    scope: 'chain-indexer',
  },
] as const;

export const HIVE_DISCOVERY_QUERIES = [
  { query: 'create hive account', expectedPath: PATHS.hiveSignup },
  { query: 'hive account signup', expectedPath: PATHS.hiveSignup },
  { query: 'how to create hive account', expectedPath: PATHS.hiveSignup },
  { query: 'register new hive user', expectedPath: PATHS.hiveSignup },
] as const;

export const HIVE_BROADCAST_DISCOVERY_QUERIES = [
  { query: 'hive blockchain broadcast', expectedPath: PATHS.hiveBroadcast },
  { query: 'broadcast custom_json odl', expectedPath: PATHS.hiveBroadcast },
  { query: 'object create broadcast hive', expectedPath: PATHS.hiveBroadcast },
  { query: 'sign hive transaction dhive', expectedPath: PATHS.hiveBroadcast },
] as const;

export const AGENT_WORKSPACE_QUERIES = [
  { query: 'setup agent workspace', expectedPath: PATHS.agentWorkspace },
  { query: 'clone repo for sidecar agent', expectedPath: PATHS.agentWorkspace },
  { query: 'agent workspace without checkout', expectedPath: PATHS.agentWorkspace },
] as const;

export const ROUTING_DISCOVERY_QUERIES = [
  { query: 'knowledge api routing', expectedPath: PATHS.knowledgeRouting },
  { query: 'how to use knowledge mcp', expectedPath: PATHS.knowledgeRouting },
  { query: 'agent first visit documentation', expectedPath: PATHS.knowledgeRouting },
] as const;

export const LOCAL_DEV_QUERIES = [
  { query: 'local development environment', expectedPath: PATHS.localDev },
  { query: 'prepare local development environment', expectedPath: PATHS.localDev },
  { query: 'how to run the project locally', expectedPath: PATHS.localDev },
] as const;

export const OBL_OFFERS_DISCOVERY_QUERIES = [
  { query: 'sign obl contract', expectedPath: PATHS.oblOffersContracts },
  { query: 'publish obl offer', expectedPath: PATHS.oblOffersContracts },
  { query: 'obl contract signParams metadata', expectedPath: PATHS.oblOffersContracts },
  { query: 'buildOblContractSignOp', expectedPath: PATHS.oblOffersContracts },
] as const;

export const OBL_LEDGER_DISCOVERY_QUERIES = [
  { query: 'obl pair balance', expectedPath: PATHS.oblLedger },
  { query: 'issue invoice obl', expectedPath: PATHS.oblLedger },
  { query: 'mutual ledger payments', expectedPath: PATHS.oblLedger },
  { query: 'get_obl_balance', expectedPath: PATHS.oblLedger },
] as const;

export const OBL_DISPUTES_DISCOVERY_QUERIES = [
  { query: 'resolve obl dispute', expectedPath: PATHS.oblDisputes },
  { query: 'obl arbitration inbox', expectedPath: PATHS.oblDisputes },
  { query: 'buildOblDisputeOpenOp', expectedPath: PATHS.oblDisputes },
  { query: 'open obl dispute on invoice', expectedPath: PATHS.oblDisputes },
] as const;

export function assertSearchFindsSkill(
  results: SearchResult[],
  expectedPath: string,
  topN = 3,
): void {
  const topPaths = results.slice(0, topN).map((r) => r.file_path);
  expect(topPaths).toContain(expectedPath);
}

export function assertTopResultIs(results: SearchResult[], expectedPath: string): void {
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].file_path).toBe(expectedPath);
}

export function assertTopResultIsNot(results: SearchResult[], excludedPath: string): void {
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].file_path).not.toBe(excludedPath);
}
