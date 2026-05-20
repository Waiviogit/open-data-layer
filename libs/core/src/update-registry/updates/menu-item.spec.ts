import { UPDATE_MENU_ITEM_SCHEMA } from './menu-item';

describe('UPDATE_MENU_ITEM_SCHEMA', () => {
  const base = {
    style: 'standard',
    link_to_object: 'obj-ref-abc',
    object_type: 'page',
  } as const;

  it('accepts object link without title when object_type is set', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejects object link without object_type', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse({
      style: 'standard',
      link_to_object: 'obj-ref-abc',
    });
    expect(r.success).toBe(false);
  });

  it('accepts web link with non-empty title', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse({
      style: 'standard',
      title: 'External',
      link_to_web: 'https://example.com/path',
    });
    expect(r.success).toBe(true);
  });

  it('rejects web link without title', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse({
      style: 'standard',
      link_to_web: 'https://example.com/path',
    });
    expect(r.success).toBe(false);
  });

  it('rejects web link when title is only whitespace', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse({
      style: 'standard',
      title: '   ',
      link_to_web: 'https://example.com/path',
    });
    expect(r.success).toBe(false);
  });

  it('when both links are set, requires object_type and non-empty title', () => {
    expect(
      UPDATE_MENU_ITEM_SCHEMA.safeParse({
        style: 'standard',
        title: 'Both',
        link_to_object: 'obj-ref-abc',
        object_type: 'page',
        link_to_web: 'https://example.com/a',
      }).success,
    ).toBe(true);

    expect(
      UPDATE_MENU_ITEM_SCHEMA.safeParse({
        style: 'standard',
        link_to_object: 'obj-ref-abc',
        link_to_web: 'https://example.com/a',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid style', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse({
      style: 'invalid',
      link_to_object: 'obj-ref-abc',
      object_type: 'page',
    });
    expect(r.success).toBe(false);
  });

  it('accepts all menu item styles', () => {
    for (const style of ['standard', 'highlight', 'icon', 'image'] as const) {
      expect(
        UPDATE_MENU_ITEM_SCHEMA.safeParse({
          style,
          link_to_object: 'obj-ref-abc',
          object_type: 'page',
        }).success,
      ).toBe(true);
    }
  });

  it('rejects neither link', () => {
    const r = UPDATE_MENU_ITEM_SCHEMA.safeParse({
      style: 'standard',
      title: 'x',
      object_type: 'page',
    });
    expect(r.success).toBe(false);
  });
});
