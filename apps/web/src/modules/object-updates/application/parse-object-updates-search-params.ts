export type ObjectUpdatesUrlFilters = {
  sort: 'recency' | 'approval';
  update_type: string | undefined;
  locale: string | undefined;
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) {
    return v[0];
  }
  return v;
}

export function parseObjectUpdatesSearchParams(
  sp: Record<string, string | string[] | undefined>,
): ObjectUpdatesUrlFilters {
  const sortRaw = firstString(sp.sort);
  const sort: ObjectUpdatesUrlFilters['sort'] =
    sortRaw === 'approval' ? 'approval' : 'recency';

  const typeRaw = firstString(sp.update_type);
  const update_type =
    typeRaw != null && typeRaw.trim().length > 0 ? typeRaw.trim() : undefined;

  const localeRaw = firstString(sp.locale);
  const locale =
    localeRaw != null && localeRaw.trim().length > 0 ? localeRaw.trim() : undefined;

  return { sort, update_type, locale };
}
