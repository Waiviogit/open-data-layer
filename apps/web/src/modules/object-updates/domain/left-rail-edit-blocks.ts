import {
  resolveEditModeLeftRailBlockOrder,
  type EditModeLeftRailBlockId,
} from '@/modules/object/domain/object-left-rail-order';
import { OBJECT_LEFT_RAIL_BLOCK_LABEL } from '@/modules/object/domain/object-update-labels';
import type { ObjectLeftRailBlock } from '@/modules/object/domain/object-page.types';
import type { EditFieldGroupId } from '@opden-data-layer/core/update-registry';

import {
  BLOCK_KIND_TO_UPDATE_TYPES,
  type ObjectLeftRailBlockKind,
} from './block-update-type-map';
import { resolveEditGroupForBlockKind } from './edit-mode-block-order';

function isEditableKind(
  kind: EditModeLeftRailBlockId,
  supported: Set<string>,
): boolean {
  const candidates = BLOCK_KIND_TO_UPDATE_TYPES[kind as ObjectLeftRailBlockKind];
  return candidates.some((t) => supported.has(t));
}

function createEmptyBlock(kind: ObjectLeftRailBlockKind): ObjectLeftRailBlock {
  const headingLabel = OBJECT_LEFT_RAIL_BLOCK_LABEL[kind] ?? kind;
  switch (kind) {
    case 'name':
      return { kind: 'name', headingLabel, text: '' };
    case 'title':
      return { kind: 'title', headingLabel, text: '' };
    case 'menuItems':
      return { kind: 'menuItems', headingLabel, items: [] };
    case 'image':
      return { kind: 'image', headingLabel, url: null };
    case 'imageBackground':
      return { kind: 'imageBackground', headingLabel, url: null };
    case 'parent':
      return {
        kind: 'parent',
        headingLabel,
        objectId: '',
        name: '',
        imageUrl: null,
      };
    case 'description':
      return { kind: 'description', headingLabel, text: '' };
    case 'button':
      return { kind: 'button', headingLabel, items: [] };
    case 'rating':
      return { kind: 'rating', headingLabel, aspects: [] };
    case 'tags':
      return { kind: 'tags', headingLabel, sections: [] };
    case 'gallery':
      return { kind: 'gallery', headingLabel, photos: [] };
    case 'price':
      return { kind: 'price', headingLabel, text: '' };
    case 'options':
      return { kind: 'options', headingLabel, currentObjectId: '', categories: [] };
    case 'workHours':
      return { kind: 'workHours', headingLabel, lines: [] };
    case 'address':
      return { kind: 'address', headingLabel, text: '' };
    case 'geo':
      return { kind: 'geo', headingLabel };
    case 'websites':
      return { kind: 'websites', headingLabel, entries: [] };
    case 'productWeight':
      return { kind: 'productWeight', headingLabel, value: 0, unit: '' };
    case 'link':
      return { kind: 'link', headingLabel, items: [] };
    case 'phones':
      return { kind: 'phones', headingLabel, entries: [] };
    case 'email':
      return { kind: 'email', headingLabel, address: '' };
    case 'walletAddress':
      return { kind: 'walletAddress', headingLabel, items: [] };
    case 'identifier':
      return { kind: 'identifier', headingLabel, rows: [] };
    case 'productGroupId':
      return { kind: 'productGroupId', headingLabel, text: '' };
    case 'status':
      return { kind: 'status', headingLabel };
    case 'compareAtPrice':
      return { kind: 'compareAtPrice', headingLabel };
    case 'saleEvent':
      return { kind: 'saleEvent', headingLabel };
    case 'size':
      return {
        kind: 'size',
        headingLabel,
        length: 0,
        width: 0,
        depth: 0,
        unit: '',
      };
    case 'brand':
      return { kind: 'brand', headingLabel, items: [] };
    case 'manufacturer':
      return { kind: 'manufacturer', headingLabel, items: [] };
    case 'merchant':
      return { kind: 'merchant', headingLabel, items: [] };
    case 'featureList':
      return { kind: 'featureList', headingLabel, items: [] };
    case 'license':
      return { kind: 'license', headingLabel, text: '' };
    case 'compatibility':
      return { kind: 'compatibility', headingLabel, text: '' };
    case 'metadata':
      return { kind: 'metadata', headingLabel, items: [] };
    case 'allowedTools':
      return { kind: 'allowedTools', headingLabel, items: [] };
    case 'references':
      return { kind: 'references', headingLabel, items: [] };
    case 'category':
      return { kind: 'category', headingLabel, names: [] };
    case 'calories':
      return { kind: 'calories', headingLabel, text: '' };
    case 'budget':
      return { kind: 'budget', headingLabel, text: '' };
    case 'cookTime':
      return { kind: 'cookTime', headingLabel, text: '' };
    case 'ingredients':
      return { kind: 'ingredients', headingLabel, items: [] };
    case 'nutrition':
      return { kind: 'nutrition', headingLabel, text: '' };
    case 'author':
      return { kind: 'author', headingLabel, items: [] };
    case 'publisher':
      return { kind: 'publisher', headingLabel, items: [] };
    case 'datePublished':
      return { kind: 'datePublished', headingLabel, text: '' };
    case 'inLanguage':
      return { kind: 'inLanguage', headingLabel, text: '' };
    case 'typicalAgeRange':
      return { kind: 'typicalAgeRange', headingLabel, text: '' };
    case 'printLength':
      return { kind: 'printLength', headingLabel, text: '' };
    case 'sortCustom':
      return { kind: 'sortCustom', headingLabel };
    case 'promotion':
      return { kind: 'promotion', headingLabel };
    case 'pin':
      return { kind: 'pin', headingLabel };
    case 'remove':
      return { kind: 'remove', headingLabel };
    case 'delegation':
      return { kind: 'delegation', headingLabel };
    case 'objectControl':
      return { kind: 'objectControl', headingLabel, text: '' };
    case 'admins':
      return { kind: 'admins', headingLabel, accounts: [] };
    case 'moderators':
      return { kind: 'moderators', headingLabel, accounts: [] };
    case 'trusted':
      return { kind: 'trusted', headingLabel, accounts: [] };
    case 'authorities':
      return { kind: 'authorities', headingLabel, accounts: [] };
    case 'whitelist':
      return { kind: 'whitelist', headingLabel, accounts: [] };
    case 'restricted':
      return { kind: 'restricted', headingLabel, accounts: [] };
    case 'banned':
      return { kind: 'banned', headingLabel, accounts: [] };
    case 'inheritsFrom':
      return { kind: 'inheritsFrom', headingLabel, entries: [] };
    case 'validityCutoff':
      return { kind: 'validityCutoff', headingLabel, entries: [] };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * In edit mode, show every supported left-rail slot (heading + add) even when empty.
 * View-mode blocks with content are reused; missing slots get empty placeholders.
 */
export function mergeLeftRailBlocksForEditMode(
  viewBlocks: ObjectLeftRailBlock[],
  supportedUpdateTypes: readonly string[],
  objectType = '',
): ObjectLeftRailBlock[] {
  const supported = new Set(supportedUpdateTypes);
  const byKind = new Map<ObjectLeftRailBlock['kind'], ObjectLeftRailBlock>();
  for (const block of viewBlocks) {
    byKind.set(block.kind, block);
  }

  const merged: ObjectLeftRailBlock[] = [];
  const slotOrder = resolveEditModeLeftRailBlockOrder(objectType);

  for (const slot of slotOrder) {
    if (!isEditableKind(slot, supported)) {
      continue;
    }

    const kind = slot as ObjectLeftRailBlockKind;
    const existing = byKind.get(kind);
    merged.push(existing ?? createEmptyBlock(kind));
  }

  return merged;
}

export interface EditModeBlockGroup {
  groupId: EditFieldGroupId;
  blocks: ObjectLeftRailBlock[];
}

/** Groups consecutive edit-mode blocks by catalog section (empty groups omitted upstream). */
export function groupEditModeBlocks(
  blocks: readonly ObjectLeftRailBlock[],
  objectType = '',
): EditModeBlockGroup[] {
  const groups: EditModeBlockGroup[] = [];

  for (const block of blocks) {
    const groupId = resolveEditGroupForBlockKind(block.kind, objectType);
    if (!groupId) {
      continue;
    }
    const last = groups[groups.length - 1];
    if (last?.groupId === groupId) {
      last.blocks.push(block);
    } else {
      groups.push({ groupId, blocks: [block] });
    }
  }

  return groups;
}
