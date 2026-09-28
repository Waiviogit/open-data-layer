import { getObjectCreatePlaybook, resolveObjectCreatePlaybookPath } from './object-create-playbook';

const mockRepo = {
  findFileByPath: jest.fn(),
};

describe('resolveObjectCreatePlaybookPath', () => {
  it('maps object type to docs path', () => {
    expect(resolveObjectCreatePlaybookPath('recipe')).toBe(
      'docs/skills/object-create/recipe.md',
    );
  });
});

describe('getObjectCreatePlaybook', () => {
  beforeEach(() => {
    mockRepo.findFileByPath.mockReset();
  });

  it('returns null for unknown object type', async () => {
    const result = await getObjectCreatePlaybook({
      objectType: 'unknown-type',
      repo: mockRepo as never,
    });
    expect(result).toBeNull();
  });

  it('returns registry, required updates, and summaries for recipe', async () => {
    const body = '# Create recipe\n\n'.padEnd(100, 'x');
    mockRepo.findFileByPath.mockResolvedValue({
      path: 'docs/skills/object-create/recipe.md',
      title: 'Create recipe object',
      description: 'Recipe playbook',
      body,
    });

    const result = await getObjectCreatePlaybook({
      objectType: 'recipe',
      repo: mockRepo as never,
    });

    expect(result).not.toBeNull();
    expect(result!.object_type).toBe('recipe');
    expect(result!.required_updates).toEqual(
      expect.arrayContaining(['name', 'description', 'image', 'ingredients']),
    );
    expect(result!.update_summaries.some((s) => s.update_type === 'name')).toBe(true);
    expect(result!.update_summaries.find((s) => s.update_type === 'name')?.localizable).toBe(
      true,
    );
    expect(result!.registry.example_create_payload).toContain('required_posting_auths');
    expect(result!.registry.example_create_payload).not.toContain('creator');
    expect(result!.playbook?.truncated).toBe(false);
    expect(result!.playbook_missing).toBe(false);
  });

  it('truncates excerpt at heading boundary', async () => {
    const section = '\n## Section\n\ncontent line here\n';
    const body = '# Title\n\nintro\n' + section.repeat(800);
    mockRepo.findFileByPath.mockResolvedValue({
      path: 'docs/skills/object-create/recipe.md',
      title: 'Create recipe object',
      description: null,
      body,
    });

    const result = await getObjectCreatePlaybook({
      objectType: 'recipe',
      repo: mockRepo as never,
    });

    expect(result!.playbook!.truncated).toBe(true);
    expect(result!.playbook!.excerpt.length).toBeLessThan(body.length);
    expect(result!.playbook!.excerpt.length).toBeLessThanOrEqual(12_000);
  });

  it('sets playbook_missing when indexed file absent', async () => {
    mockRepo.findFileByPath.mockResolvedValue(null);

    const result = await getObjectCreatePlaybook({
      objectType: 'dish',
      repo: mockRepo as never,
    });

    expect(result!.playbook_missing).toBe(true);
    expect(result!.playbook).toBeNull();
    expect(result!.warnings).toContain(
      'playbook file missing: docs/skills/object-create/dish.md',
    );
  });
});
