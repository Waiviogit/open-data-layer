import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { ObjectLeftRailBlock } from '@/modules/object/domain/object-page.types';

import { mergeLeftRailBlocksForEditMode } from './left-rail-edit-blocks';

describe('mergeLeftRailBlocksForEditMode', () => {
  const supported = [
    UPDATE_TYPES.NAME,
    UPDATE_TYPES.TITLE,
    UPDATE_TYPES.DESCRIPTION,
    UPDATE_TYPES.WEBSITE,
  ];

  it('places name and title before description and includes empty website slot', () => {
    const viewBlocks: ObjectLeftRailBlock[] = [
      {
        kind: 'description',
        headingLabel: 'Description',
        text: 'About us',
      },
    ];

    const merged = mergeLeftRailBlocksForEditMode(viewBlocks, supported);
    const kinds = merged.map((b) => b.kind);

    expect(kinds.indexOf('name')).toBeLessThan(kinds.indexOf('title'));
    expect(kinds.indexOf('title')).toBeLessThan(kinds.indexOf('description'));
    expect(kinds).toContain('websites');

    const website = merged.find((b) => b.kind === 'websites');
    expect(website?.kind).toBe('websites');
    if (website?.kind === 'websites') {
      expect(website.entries).toEqual([]);
    }
  });

  it('reuses existing blocks when present', () => {
    const viewBlocks: ObjectLeftRailBlock[] = [
      { kind: 'name', headingLabel: 'Name', text: 'Shop' },
    ];
    const merged = mergeLeftRailBlocksForEditMode(viewBlocks, supported);
    expect(merged.find((b) => b.kind === 'name')).toEqual(viewBlocks[0]);
  });
});
