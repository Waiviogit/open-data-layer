import type { ObjectOptionValueView } from '../../domain/object-page.types';

import {
  buildOptionsBack,
  buildOwnOptions,
  optionButtonClassName,
  optionImageSrc,
  optionPreviewImageSrc,
  resolveNavigationTarget,
  sortOptionCategories,
} from './object-options-section.utils';

function entry(
  partial: Partial<ObjectOptionValueView> & Pick<ObjectOptionValueView, 'category' | 'value' | 'objectId'>,
): ObjectOptionValueView {
  return {
    position: 1,
    image: null,
    price: null,
    imageUrl: null,
    ...partial,
  };
}

describe('object-options-section.utils', () => {
  describe('optionImageSrc', () => {
    it('returns image only when option.image is set', () => {
      expect(optionImageSrc(entry({ category: 'Color', value: 'Red', objectId: 'a', image: 'https://x.png' }))).toBe(
        'https://x.png',
      );
      expect(
        optionImageSrc(
          entry({
            category: 'Size',
            value: '11',
            objectId: 'a',
            image: null,
            imageUrl: 'https://avatar.png',
          }),
        ),
      ).toBeNull();
    });
  });

  describe('optionPreviewImageSrc', () => {
    it('prefers sibling avatar (imageUrl) over option swatch', () => {
      expect(
        optionPreviewImageSrc(
          entry({
            category: 'Style',
            value: 'Serum',
            objectId: 'a',
            image: 'https://swatch.png',
            imageUrl: 'https://avatar.png',
          }),
        ),
      ).toBe('https://avatar.png');
    });

    it('falls back to option swatch when avatar is missing', () => {
      expect(
        optionPreviewImageSrc(
          entry({
            category: 'Color',
            value: 'Red',
            objectId: 'a',
            image: 'https://swatch.png',
            imageUrl: null,
          }),
        ),
      ).toBe('https://swatch.png');
    });

    it('returns null when neither avatar nor swatch is set', () => {
      expect(
        optionPreviewImageSrc(
          entry({
            category: 'Size',
            value: 'L',
            objectId: 'a',
            image: null,
            imageUrl: null,
          }),
        ),
      ).toBeNull();
    });
  });

  describe('sortOptionCategories', () => {
    it('orders Color first, then image categories, then alpha', () => {
      const sorted = sortOptionCategories([
        { category: 'Size', values: [entry({ category: 'Size', value: 'L', objectId: 'a' })] },
        {
          category: 'Material',
          values: [
            entry({
              category: 'Material',
              value: 'Cotton',
              objectId: 'a',
              image: 'https://x.png',
            }),
          ],
        },
        { category: 'Color', values: [entry({ category: 'Color', value: 'Red', objectId: 'a' })] },
        { category: 'Brand', values: [entry({ category: 'Brand', value: 'X', objectId: 'a' })] },
      ]);

      expect(sorted.map((c) => c.category)).toEqual(['Color', 'Material', 'Brand', 'Size']);
    });
  });

  describe('resolveNavigationTarget', () => {
    it('picks compatible sibling when other category is selected', () => {
      const categories = [
        {
          category: 'Color',
          values: [
            entry({ category: 'Color', value: 'Red', objectId: 'red-s' }),
            entry({ category: 'Color', value: 'Blue', objectId: 'blue-m' }),
          ],
        },
        {
          category: 'Size',
          values: [
            entry({ category: 'Size', value: 'S', objectId: 'red-s' }),
            entry({ category: 'Size', value: 'M', objectId: 'blue-m' }),
          ],
        },
      ];
      const back = buildOptionsBack(categories);
      const own = buildOwnOptions('red-s', categories);

      expect(resolveNavigationTarget(entry({ category: 'Size', value: 'M', objectId: 'blue-m' }), own, back)).toBe(
        'blue-m',
      );
    });

    it('falls back to entry object id when no compatible sibling', () => {
      const categories = [
        {
          category: 'Color',
          values: [entry({ category: 'Color', value: 'Red', objectId: 'only' })],
        },
      ];
      const back = buildOptionsBack(categories);
      const own = buildOwnOptions('only', categories);
      const target = entry({ category: 'Color', value: 'Red', objectId: 'only' });

      expect(resolveNavigationTarget(target, own, back)).toBe('only');
    });
  });

  describe('optionButtonClassName', () => {
    const baseArgs = {
      currentObjectId: 'current',
      ownOptions: {} as Record<string, ObjectOptionValueView>,
      activeSelection: {} as Record<string, ObjectOptionValueView>,
      optionsBack: {} as Record<string, string[]>,
    };

    it('uses accent border when selected', () => {
      const e = entry({ category: 'Color', value: 'Red', objectId: 'current' });
      const className = optionButtonClassName({
        ...baseArgs,
        entry: e,
        isSelected: true,
      });
      expect(className).toContain('border-accent');
    });

    it('uses solid black border for own object', () => {
      const e = entry({ category: 'Color', value: 'Red', objectId: 'current' });
      const className = optionButtonClassName({
        ...baseArgs,
        entry: e,
        isSelected: false,
      });
      expect(className).toContain('border-black');
      expect(className).not.toContain('border-dashed');
    });

    it('uses dashed black border for incompatible variants', () => {
      const e = entry({ category: 'Color', value: 'Blue', objectId: 'other' });
      const className = optionButtonClassName({
        ...baseArgs,
        entry: e,
        isSelected: false,
      });
      expect(className).toContain('border-dashed');
      expect(className).toContain('border-black');
    });

    it('uses fixed 50px square for swatch mode', () => {
      const e = entry({ category: 'Color', value: 'Red', objectId: 'current' });
      const className = optionButtonClassName({
        ...baseArgs,
        entry: e,
        isSelected: false,
        mode: 'swatch',
      });
      expect(className).toContain('size-[50px]');
      expect(className).toContain('rounded-card');
      expect(className).toContain('border-2');
      expect(className).toContain('border-fg');
      expect(className).not.toContain('rounded-btn');
      expect(className).not.toContain('px-2');
      expect(className).not.toContain('border-black');
    });

    it('uses a thicker accent border for the selected swatch', () => {
      const e = entry({ category: 'Color', value: 'Red', objectId: 'current' });
      const className = optionButtonClassName({
        ...baseArgs,
        entry: e,
        isSelected: true,
        mode: 'swatch',
      });
      expect(className).toContain('border-2');
      expect(className).toContain('border-accent');
      expect(className).not.toContain('border-dashed');
    });

    it('uses a dashed fg border for an incompatible swatch', () => {
      const e = entry({ category: 'Color', value: 'Blue', objectId: 'other' });
      const className = optionButtonClassName({
        ...baseArgs,
        entry: e,
        isSelected: false,
        mode: 'swatch',
      });
      expect(className).toContain('border-2');
      expect(className).toContain('border-dashed');
      expect(className).toContain('border-fg');
    });
  });
});
