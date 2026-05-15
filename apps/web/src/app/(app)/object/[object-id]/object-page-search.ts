import {
  AUTHORITY_SUB_VALUES,
  type AuthoritySubType,
} from '@/modules/object/domain/object-page.types';

/** Search param for the object profile primary tab (Reviews, Updates, …). */
export const OBJECT_PAGE_PRIMARY_TAB_PARAM = 'tab';

/** Administrative vs ownership lists under the Authority tab. */
export const OBJECT_PAGE_AUTHORITY_SUB_PARAM = 'sub';

export type { AuthoritySubType };

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

export function parseAuthoritySubTypeParam(
  sp: Record<string, string | string[] | undefined>,
): AuthoritySubType {
  const v = firstSearchParam(sp, OBJECT_PAGE_AUTHORITY_SUB_PARAM)?.trim();
  if (v && AUTHORITY_SUB_VALUES.includes(v as AuthoritySubType)) {
    return v as AuthoritySubType;
  }
  return 'administrative';
}
