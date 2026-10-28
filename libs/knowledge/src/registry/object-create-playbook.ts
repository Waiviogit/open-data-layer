import { getRequiredObjectCreateUpdates } from '@opden-data-layer/core/object-type-registry';
import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import type { KnowledgeRepository } from '../repository/knowledge.repository';
import { objectTypeToPlaybookPath } from '../routing/legacy-skill-path';
import { objectTypeExamplePayload } from './object-type-serializer';

const EXCERPT_MAX_CHARS = 12_000;

export function resolveObjectCreatePlaybookPath(objectType: string): string {
  return objectTypeToPlaybookPath(objectType);
}

export interface ObjectCreatePlaybookResult {
  object_type: string;
  registry: {
    description: string | null;
    supported_updates: string[];
    supposed_updates: Array<{ update_type: string; values: unknown }>;
    example_create_payload: string;
  };
  required_updates: string[];
  update_summaries: Array<{
    update_type: string;
    description: string;
    value_kind: string;
    cardinality: string;
    localizable: boolean;
    applies_to?: string[];
  }>;
  playbook: {
    path: string;
    title: string;
    description: string | null;
    excerpt: string;
    truncated: boolean;
  } | null;
  playbook_missing: boolean;
  warnings: string[];
}

function truncateAtHeading(body: string, maxChars: number): { excerpt: string; truncated: boolean } {
  if (body.length <= maxChars) {
    return { excerpt: body, truncated: false };
  }
  const slice = body.slice(0, maxChars);
  const lastHeading = slice.lastIndexOf('\n## ');
  const cutAt = lastHeading > 0 ? lastHeading : maxChars;
  return {
    excerpt: body.slice(0, cutAt).trimEnd(),
    truncated: true,
  };
}

function buildUpdateSummaries(supportedUpdates: readonly string[]) {
  return [...supportedUpdates]
    .sort()
    .map((updateType) => {
      const def = UPDATE_REGISTRY[updateType];
      if (!def) {
        return null;
      }
      return {
        update_type: updateType,
        description: def.description ?? '',
        value_kind: def.value_kind,
        cardinality: def.cardinality,
        localizable: def.localizable === true,
        ...(def.applies_to?.length ? { applies_to: [...def.applies_to] } : {}),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function getObjectCreatePlaybook(input: {
  objectType: string;
  repo: KnowledgeRepository;
}): Promise<ObjectCreatePlaybookResult | null> {
  const def = OBJECT_TYPE_REGISTRY[input.objectType];
  if (!def) {
    return null;
  }

  const playbookPath = resolveObjectCreatePlaybookPath(input.objectType);
  const file = await input.repo.findFileByPath(playbookPath);
  const warnings: string[] = [];
  const playbookMissing = !file;

  if (playbookMissing) {
    warnings.push(`playbook file missing: ${playbookPath}`);
  }

  let playbook: ObjectCreatePlaybookResult['playbook'] = null;
  if (file) {
    const { excerpt, truncated } = truncateAtHeading(file.body, EXCERPT_MAX_CHARS);
    playbook = {
      path: file.path,
      title: file.title,
      description: file.description,
      excerpt,
      truncated,
    };
  }

  return {
    object_type: input.objectType,
    registry: {
      description: def.description ?? null,
      supported_updates: [...def.supported_updates].sort(),
      supposed_updates: def.supposed_updates.map((s) => ({
        update_type: s.update_type,
        values: s.values,
      })),
      example_create_payload: objectTypeExamplePayload(input.objectType),
    },
    required_updates: getRequiredObjectCreateUpdates(input.objectType),
    update_summaries: buildUpdateSummaries(def.supported_updates),
    playbook,
    playbook_missing: playbookMissing,
    warnings,
  };
}
