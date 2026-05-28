import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';

import {
  IDENTITY_UPDATE_TYPES,
  RELATION_UPDATE_TYPES,
} from './group-fields-by-priority';
import type { FieldEntry } from './object-create.types';

const PREVIEW_MAX_LEN = 40;

export type PendingOpsCategory = 'identity' | 'relations' | 'metadata';

export type PendingOpRow = {
  key: string;
  updateType: string;
  category: PendingOpsCategory;
  opLabel: string;
  label: string;
  preview: string;
};

export type PendingOpsSummary = {
  total: number;
  byCategory: Record<PendingOpsCategory, number>;
  ops: readonly PendingOpRow[];
};

const identitySet = new Set<string>(IDENTITY_UPDATE_TYPES);

export function categorizePendingUpdateType(
  updateType: string,
): PendingOpsCategory {
  if (RELATION_UPDATE_TYPES.includes(updateType)) {
    return 'relations';
  }
  if (identitySet.has(updateType)) {
    return 'identity';
  }
  return 'metadata';
}

export function previewPendingOpValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t || t === '{\n  \n}') {
      return '';
    }
    return t.length > PREVIEW_MAX_LEN ? `${t.slice(0, PREVIEW_MAX_LEN)}…` : t;
  }
  if (Array.isArray(value)) {
    const parts = value
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim());
    if (parts.length === 0) {
      return '';
    }
    const joined = parts.join(' · ');
    return joined.length > PREVIEW_MAX_LEN
      ? `${joined.slice(0, PREVIEW_MAX_LEN)}…`
      : joined;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.url === 'string' && o.url.trim()) {
      return o.url.trim();
    }
    if (typeof o.cid === 'string' && o.cid.trim()) {
      return `cid:${o.cid.trim()}`;
    }
    if (typeof o.value === 'string' && o.value.trim()) {
      const cat =
        typeof o.category === 'string' && o.category.trim()
          ? `${o.category}: `
          : '';
      const text = `${cat}${o.value.trim()}`;
      return text.length > PREVIEW_MAX_LEN
        ? `${text.slice(0, PREVIEW_MAX_LEN)}…`
        : text;
    }
    if (typeof o.album === 'string' && o.album.trim()) {
      return o.album.trim();
    }
    try {
      const json = JSON.stringify(value);
      return json.length > PREVIEW_MAX_LEN
        ? `${json.slice(0, PREVIEW_MAX_LEN)}…`
        : json;
    } catch {
      return '';
    }
  }
  return String(value);
}

export function summarizePendingOps(
  fields: readonly FieldEntry[],
): PendingOpsSummary {
  const byCategory: Record<PendingOpsCategory, number> = {
    identity: 0,
    relations: 0,
    metadata: 0,
  };
  const ops: PendingOpRow[] = [];

  for (const entry of fields) {
    const preview = previewPendingOpValue(entry.value);
    if (!preview) {
      continue;
    }
    const category = categorizePendingUpdateType(entry.updateType);
    byCategory[category] += 1;
    const def = UPDATE_REGISTRY[entry.updateType];
    ops.push({
      key: entry.entryKey,
      updateType: entry.updateType,
      category,
      opLabel: def?.update_type ?? entry.updateType,
      label: labelForUpdateType(entry.updateType),
      preview,
    });
  }

  return {
    total: ops.length,
    byCategory,
    ops,
  };
}
