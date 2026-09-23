import type { ObjectOptionValueView } from '../../domain/object-page.types';

export type OptionCategoryGroup = {
  category: string;
  values: ObjectOptionValueView[];
};

export type SelectionMap = Record<string, ObjectOptionValueView>;

/** Legacy Options.less: 50×50px square swatch with object-fit contain. */
export const OPTION_SWATCH_SIZE_PX = 50;

/** Legacy: image swatch only when option update has `image` (not sibling avatar). */
export function optionImageSrc(entry: ObjectOptionValueView): string | null {
  const optionImage = entry.image?.trim() || null;
  return optionImage && optionImage.length > 0 ? optionImage : null;
}

/** Gallery hover preview: sibling avatar first, then option swatch. */
export function optionPreviewImageSrc(entry: ObjectOptionValueView): string | null {
  const avatar = entry.imageUrl?.trim();
  if (avatar) {
    return avatar;
  }
  return optionImageSrc(entry);
}

export function sortOptionCategories(categories: OptionCategoryGroup[]): OptionCategoryGroup[] {
  return [...categories].sort((a, b) => {
    const aIsColor = /^color$/i.test(a.category.trim());
    const bIsColor = /^color$/i.test(b.category.trim());
    if (aIsColor && !bIsColor) {
      return -1;
    }
    if (!aIsColor && bIsColor) {
      return 1;
    }
    const aHasImage = a.values.some((v) => optionImageSrc(v) != null);
    const bHasImage = b.values.some((v) => optionImageSrc(v) != null);
    if (aHasImage && !bHasImage) {
      return -1;
    }
    if (!aHasImage && bHasImage) {
      return 1;
    }
    return a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
  });
}

export function buildOptionsBack(categories: OptionCategoryGroup[]): Record<string, string[]> {
  const back: Record<string, string[]> = {};
  for (const { values } of categories) {
    for (const entry of values) {
      const list = back[entry.value] ?? [];
      if (!list.includes(entry.objectId)) {
        back[entry.value] = [...list, entry.objectId];
      }
    }
  }
  return back;
}

export function buildOwnOptions(
  currentObjectId: string,
  categories: OptionCategoryGroup[],
): SelectionMap {
  const own: SelectionMap = {};
  for (const { category, values } of categories) {
    const match = values.find((v) => v.objectId === currentObjectId);
    if (match) {
      own[category] = match;
    }
  }
  return own;
}

export function resolveNavigationTarget(
  entry: ObjectOptionValueView,
  ownOptions: SelectionMap,
  optionsBack: Record<string, string[]>,
): string {
  const activeCategories = Object.keys(ownOptions).filter((key) => key !== entry.category);
  const activeObjectIds = activeCategories.flatMap((key) => {
    const value = ownOptions[key]?.value;
    return value ? (optionsBack[value] ?? []) : [];
  });
  const candidates = optionsBack[entry.value] ?? [entry.objectId];
  const compatible = candidates.find((id) => activeObjectIds.includes(id));
  return compatible ?? entry.objectId;
}

export function optionButtonClassName(args: {
  entry: ObjectOptionValueView;
  currentObjectId: string;
  ownOptions: SelectionMap;
  activeSelection: SelectionMap;
  optionsBack: Record<string, string[]>;
  isSelected: boolean;
  mode?: 'text' | 'swatch';
}): string {
  const { entry, currentObjectId, ownOptions, activeSelection, optionsBack, isSelected } = args;
  const mode = args.mode ?? 'text';
  const isOwnObject = entry.objectId === currentObjectId;
  const activeSource = Object.keys(activeSelection).length > 0 ? activeSelection : ownOptions;
  const otherSelections = Object.values(activeSource).filter((opt) => opt.category !== entry.category);
  const isCompatible = otherSelections.some((opt) =>
    (optionsBack[opt.value] ?? []).includes(entry.objectId),
  );
  const isCompatibleCombo =
    isCompatible ||
    (optionsBack[entry.value] ?? []).some((id) =>
      otherSelections.some((opt) => (optionsBack[opt.value] ?? []).includes(id)),
    );

  const isSwatch = mode === 'swatch';
  const base = isSwatch
    ? 'inline-flex size-[50px] shrink-0 items-center justify-center overflow-hidden rounded-card border-2 p-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
    : 'inline-flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-center rounded-btn border px-2 text-body-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  const neutralBorder = isSwatch ? 'border-fg' : 'border-black';

  if (isSelected) {
    return [
      base,
      'border-accent font-weight-strong text-accent',
      isOwnObject ? 'bg-bg' : 'bg-bg text-muted',
    ].join(' ');
  }

  if (isOwnObject || isCompatibleCombo) {
    return [base, `${neutralBorder} font-weight-body text-fg`].join(' ');
  }

  return [base, `border-dashed ${neutralBorder} text-muted`].join(' ');
}
