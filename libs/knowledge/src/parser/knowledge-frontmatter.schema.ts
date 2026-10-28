import { z } from 'zod';

export const KNOWLEDGE_TYPES = [
  'spec',
  'skill',
  'playbook',
  'reference',
  'overview',
  'adr',
  'lesson',
  'agents',
  'registry',
] as const;

export const KNOWLEDGE_STATUSES = ['active', 'draft', 'deprecated'] as const;

export const knowledgeFrontmatterSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().max(1024).optional(),
  type: z.enum(KNOWLEDGE_TYPES).optional(),
  status: z.enum(KNOWLEDGE_STATUSES).default('active'),
  scope: z.string().optional(),
  tags: z.array(z.string()).default([]),
  owner: z.string().optional(),
  updated_at: z.coerce.date().optional(),
  related: z.array(z.string()).default([]),
});

export type KnowledgeFrontmatter = z.infer<typeof knowledgeFrontmatterSchema>;

export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];
