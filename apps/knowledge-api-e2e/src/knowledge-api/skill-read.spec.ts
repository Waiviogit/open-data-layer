import { mcpCallTool } from '../support/mcp-client';
import {
  ALL_SKILL_PATHS,
  PATHS,
  type GetFileResponse,
  type ListFilesResponse,
  type GetContextResponse,
  type ResolveDocResponse,
  type SearchKnowledgeResponse,
  type SearchResult,
} from '../support/knowledge-fixtures';

describe('POST /knowledge/mcp — read skills', () => {
  async function searchTopPath(query: string): Promise<SearchResult> {
    const { data, isError } = await mcpCallTool<SearchKnowledgeResponse>(
      'search_knowledge',
      { query, limit: 5 },
    );
    expect(isError).toBe(false);
    expect(data.results.length).toBeGreaterThan(0);
    return data.results[0];
  }

  it('get_context returns compact chunks for knowledge api routing', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'knowledge api routing',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.some((r) => r.file_path === PATHS.knowledgeRouting)).toBe(true);
  });

  it('get_context returns compact chunks for hive account signup', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'hive account signup',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(8);
    expect(data.results.some((r) => r.file_path === PATHS.hiveSignup)).toBe(true);
    for (const chunk of data.results) {
      expect(chunk.file_path).toBeTruthy();
      expect(chunk.content).toBeTruthy();
    }
  });

  it('get_context returns compact chunks for hive blockchain broadcast', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'hive blockchain broadcast',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(8);
    expect(data.results.some((r) => r.file_path === PATHS.hiveBroadcast)).toBe(true);
  });

  it('get_context returns compact chunks for setup agent workspace', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'setup agent workspace',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(8);
    expect(data.results.some((r) => r.file_path === PATHS.agentWorkspace)).toBe(true);
  });

  it('get_context returns chunks from getting-started for local development', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'local development environment',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.some((r) => r.file_path === PATHS.localDev)).toBe(true);
  });

  it('get_context returns compact chunks for OBL offers and contracts', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'sign obl contract',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.some((r) => r.file_path === PATHS.oblOffersContracts)).toBe(true);
  });

  it('get_context returns compact chunks for OBL ledger', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'obl pair balance',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.some((r) => r.file_path === PATHS.oblLedger)).toBe(true);
  });

  it('get_context returns compact chunks for OBL disputes', async () => {
    const { data, isError } = await mcpCallTool<GetContextResponse>('get_context', {
      topic: 'resolve obl dispute',
      max_chunks: 8,
    });
    expect(isError).toBe(false);
    expect(data.results.some((r) => r.file_path === PATHS.oblDisputes)).toBe(true);
  });

  it('get_file returns full markdown from discovered hive signup search path', async () => {
    const hit = await searchTopPath('hive account signup');
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: hit.file_path,
    });
    expect(isError).toBe(false);
    expect(data.path).toBe(hit.file_path);
    expect(data.body).toContain('Hive account signup');
    expect(data.body).toContain('signup.hive.io');
  });

  it('get_file returns full markdown for hive blockchain broadcast skill', async () => {
    const hit = await searchTopPath('hive blockchain broadcast');
    expect(hit.file_path).toBe(PATHS.hiveBroadcast);
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: hit.file_path,
    });
    expect(isError).toBe(false);
    expect(data.path).toBe(PATHS.hiveBroadcast);
    expect(data.body).toContain('Hive blockchain broadcast (ODL)');
    expect(data.body).toContain('custom_json');
    expect(data.body).toContain('@hiveio/dhive');
  });

  it('get_file returns OBL offers and contracts skill with builders', async () => {
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: PATHS.oblOffersContracts,
    });
    expect(isError).toBe(false);
    expect(data.body).toContain('OBL offers and contracts');
    expect(data.body).toContain('buildOblContractSignOp');
    expect(data.body).toContain('obl-mainnet');
  });

  it('get_file returns OBL ledger skill with balance tool', async () => {
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: PATHS.oblLedger,
    });
    expect(isError).toBe(false);
    expect(data.body).toContain('OBL mutual ledger');
    expect(data.body).toContain('get_obl_balance');
    expect(data.body).toContain('buildOblInvoiceIssueOp');
  });

  it('get_file returns OBL disputes skill with arbitration', async () => {
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: PATHS.oblDisputes,
    });
    expect(isError).toBe(false);
    expect(data.body).toContain('OBL disputes and arbitration');
    expect(data.body).toContain('buildOblDisputeOpenOp');
    expect(data.body).toContain('get_obl_arbitration');
  });

  it('get_file returns controlled error for missing path', async () => {
    const { isError, rawText } = await mcpCallTool('get_file', {
      path: 'docs/skills/does-not-exist.md',
    });
    expect(isError).toBe(true);
    expect(rawText).toContain('File not found');
  });

  it('get_file returns routing skill with decision table', async () => {
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: PATHS.knowledgeRouting,
    });
    expect(isError).toBe(false);
    expect(data.description).toBeTruthy();
    expect(data.body).toContain('Decision table');
    expect(data.body).toContain('list_files');
  });

  it('get_file maps a legacy docs/skills path and reports moved_from', async () => {
    const { data, isError } = await mcpCallTool<GetFileResponse>('get_file', {
      path: 'docs/skills/hive-account-signup.md',
    });
    expect(isError).toBe(false);
    expect(data.path).toBe(PATHS.hiveSignup);
    expect(data.moved_from).toBe('docs/skills/hive-account-signup.md');
  });

  it('search_knowledge results include description field', async () => {
    const { data, isError } = await mcpCallTool<SearchKnowledgeResponse>(
      'search_knowledge',
      { query: 'hive account signup', limit: 3 },
    );
    expect(isError).toBe(false);
    expect(data.results.length).toBeGreaterThan(0);
    const hit = data.results.find((r) => r.file_path === PATHS.hiveSignup);
    expect(hit?.description).toBeTruthy();
  });

  it('resolve_doc returns routing skill for knowledge api routing', async () => {
    const { data, isError } = await mcpCallTool<ResolveDocResponse>('resolve_doc', {
      topic: 'knowledge api routing',
    });
    expect(isError).toBe(false);
    expect(data.routes.some((r) => r.path === PATHS.knowledgeRouting)).toBe(true);
  });

  it('list_files paginates skill catalog', async () => {
    const { data, isError } = await mcpCallTool<ListFilesResponse>('list_files', {
      type: 'skill',
      limit: 2,
      offset: 0,
    });
    expect(isError).toBe(false);
    expect(data.files.length).toBe(2);
    expect(data.total).toBeGreaterThanOrEqual(ALL_SKILL_PATHS.length);
    expect(data.limit).toBe(2);
    expect(data.offset).toBe(0);
  });

  it('list_files with type skill includes all skills with description metadata', async () => {
    const { data, isError } = await mcpCallTool<ListFilesResponse>('list_files', {
      type: 'skill',
      limit: 50,
    });
    expect(isError).toBe(false);

    for (const skillPath of ALL_SKILL_PATHS) {
      expect(data.files.map((f) => f.path)).toContain(skillPath);
      const file = data.files.find((f) => f.path === skillPath);
      expect(file?.title).toBeTruthy();
      expect(file?.type).toBe('skill');
      expect(file?.status).toBe('active');
      expect(file?.description?.length).toBeGreaterThan(0);
      expect(file?.description).not.toMatch(/^>-$/);
    }
  });
});
