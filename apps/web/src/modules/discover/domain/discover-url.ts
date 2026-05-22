export type DiscoverUrlParams = {
  type?: string;
  users?: boolean;
  q?: string;
  tags?: string[];
  sort?: 'newest' | 'oldest' | 'rank';
};

export function buildDiscoverHref(params: DiscoverUrlParams): string {
  const sp = new URLSearchParams();
  if (params.users) {
    sp.set('users', '1');
  } else if (params.type?.trim()) {
    sp.set('type', params.type.trim());
  }
  const q = params.q?.trim();
  if (q) {
    sp.set('q', q);
  }
  for (const tag of params.tags ?? []) {
    const t = tag.trim();
    if (t) {
      sp.append('tags', t);
    }
  }
  if (params.sort && params.sort !== 'newest') {
    sp.set('sort', params.sort);
  }
  const qs = sp.toString();
  return qs.length > 0 ? `/discover?${qs}` : '/discover';
}

export function parseDiscoverTagsParam(raw: string | string[] | undefined): string[] {
  if (raw == null) {
    return [];
  }
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((s) => s.trim()).filter((s) => s.length > 0);
}
