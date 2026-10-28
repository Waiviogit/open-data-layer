import { parseFrontmatterYaml, splitFrontmatter } from './parse-frontmatter';

describe('parseFrontmatterYaml', () => {
  it('parses folded block scalars used by Agent Skills descriptions', () => {
    const yaml = [
      'name: knowledge-api-routing',
      'description: >-',
      '  First-visit map for MCP tools, doc types, and which skill or spec to open.',
      '  Use when first connecting to knowledge-api MCP.',
    ].join('\n');

    expect(parseFrontmatterYaml(yaml)).toEqual({
      name: 'knowledge-api-routing',
      description:
        'First-visit map for MCP tools, doc types, and which skill or spec to open. Use when first connecting to knowledge-api MCP.',
    });
  });

  it('parses literal block scalars', () => {
    const yaml = ['notes: |', '  line one', '  line two'].join('\n');
    expect(parseFrontmatterYaml(yaml)['notes']).toBe('line one\nline two');
  });

  it('still parses inline scalars and arrays', () => {
    const yaml = ['title: Hello', 'tags: [a, b]', 'draft: true'].join('\n');
    expect(parseFrontmatterYaml(yaml)).toEqual({
      title: 'Hello',
      tags: ['a', 'b'],
      draft: true,
    });
  });
});

describe('splitFrontmatter', () => {
  it('splits YAML from the markdown body', () => {
    const raw = '---\nname: foo\n---\n\n# Title\n';
    expect(splitFrontmatter(raw)).toEqual({
      frontmatter: 'name: foo',
      body: '\n# Title\n',
    });
  });
});
