/** Search param for the object profile primary tab (Reviews, Updates, …). */
export const OBJECT_PAGE_PRIMARY_TAB_PARAM = 'tab';

export function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) {
    return v[0];
  }
  return v;
}
