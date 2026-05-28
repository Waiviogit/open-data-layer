import {
  getSemanticBlocks,
  groupFieldsByPriority,
} from './group-fields-by-priority';

describe('groupFieldsByPriority', () => {
  it('puts name, description, image in required for recipe', () => {
    const groups = groupFieldsByPriority('recipe');
    expect(groups.required).toEqual(
      expect.arrayContaining(['name', 'description', 'image']),
    );
  });

  it('includes tagCategory from supposed_updates in recommended for recipe', () => {
    const groups = groupFieldsByPriority('recipe');
    expect(groups.recommended).toContain('tagCategory');
  });

  it('excludes relation types from advanced bucket', () => {
    const groups = groupFieldsByPriority('recipe');
    expect(groups.advanced).not.toContain('parent');
    expect(groups.advanced).not.toContain('addOn');
  });

  it('puts ingredients in required for recipe', () => {
    const groups = groupFieldsByPriority('recipe');
    expect(groups.required).toContain('ingredients');
    expect(groups.advanced).not.toContain('ingredients');
  });
});

describe('getSemanticBlocks', () => {
  it('puts all required types in the first block for recipe', () => {
    const blocks = getSemanticBlocks('recipe');
    expect(blocks[0]?.id).toBe('required');
    expect(blocks[0]?.types).toEqual(
      expect.arrayContaining(['name', 'description', 'image', 'ingredients']),
    );
  });

  it('does not duplicate required types in identity or context', () => {
    const blocks = getSemanticBlocks('recipe');
    const identity = blocks.find((b) => b.id === 'identity');
    const context = blocks.find((b) => b.id === 'context');
    expect(identity?.types ?? []).not.toEqual(
      expect.arrayContaining(['name', 'description']),
    );
    expect(context?.types ?? []).not.toContain('ingredients');
  });
});
