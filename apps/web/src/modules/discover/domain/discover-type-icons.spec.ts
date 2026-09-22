import { ICON_REGISTRY } from '@/icons';

import { DISCOVER_TYPE_ICONS, iconForDiscoverObjectType } from './discover-type-icons';
import { listDiscoverObjectTypes } from './discover-registry';

describe('discover type icons', () => {
  it('maps every registry object type to a registered glyph', () => {
    for (const type of listDiscoverObjectTypes()) {
      const iconName = DISCOVER_TYPE_ICONS[type as keyof typeof DISCOVER_TYPE_ICONS];
      expect(iconName).toBeDefined();
      expect(ICON_REGISTRY[iconName]).toBeDefined();
    }
  });

  it('falls back for an unknown type', () => {
    expect(iconForDiscoverObjectType('not-a-type')).toBe('layout-grid');
  });
});