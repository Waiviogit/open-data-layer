import { mcpCallTool } from '../support/mcp-client';

interface ObjectCreatePlaybookResponse {
  object_type: string;
  required_updates: string[];
  update_summaries: Array<{ update_type: string; localizable: boolean }>;
  playbook: { path: string; excerpt: string } | null;
  playbook_missing: boolean;
  warnings: string[];
}

describe('POST /knowledge/mcp — get_object_create_playbook', () => {
  it('returns recipe playbook with required updates and summaries', async () => {
    const { data, isError } = await mcpCallTool<ObjectCreatePlaybookResponse>(
      'get_object_create_playbook',
      { object_type: 'recipe' },
    );
    expect(isError).toBe(false);
    expect(data.object_type).toBe('recipe');
    expect(data.required_updates).toEqual(
      expect.arrayContaining(['name', 'description', 'image', 'ingredients']),
    );
    expect(data.update_summaries.some((s) => s.update_type === 'name')).toBe(true);
    expect(data.playbook?.path).toBe('odl/object-create/references/recipe.md');
    expect(data.playbook?.excerpt).toContain('Create recipe');
    expect(data.playbook_missing).toBe(false);
  });

  it('returns error for unknown object type', async () => {
    const { isError, rawText } = await mcpCallTool('get_object_create_playbook', {
      object_type: 'not-a-real-type',
    });
    expect(isError).toBe(true);
    expect(rawText).toContain('Unknown object type');
  });

  it('get_update_schema includes localizable metadata', async () => {
    const { data, isError } = await mcpCallTool<{
      update_type: string;
      localizable: boolean;
      namespace: string | null;
      semantic_key: string | null;
    }>('get_update_schema', { update_type: 'name' });
    expect(isError).toBe(false);
    expect(data.update_type).toBe('name');
    expect(data.localizable).toBe(true);
    expect(data.semantic_key).toBe('name');
  });
});
