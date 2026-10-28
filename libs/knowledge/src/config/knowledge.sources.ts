export interface KnowledgeSourceRoot {
  root: string;
  glob?: string;
  files?: string[];
  ignore?: string[];
}

export const KNOWLEDGE_SOURCE_ROOTS: KnowledgeSourceRoot[] = [
  { root: 'docs', glob: '**/*.md' },
  { root: 'tasks', files: ['lessons.md'] },
  {
    root: '.',
    glob: '**/AGENTS.md',
    ignore: ['node_modules/**', 'dist/**', 'generated/**', '.git/**', 'vendor/**'],
  },
];

export const KNOWLEDGE_IGNORE_SEGMENTS = [
  'node_modules',
  'dist',
  'generated',
  '.git',
  'tmp',
  'vendor',
  /** Draft copies under docs/standards/templates — not agent-searchable. */
  'templates',
];
