export const SITE_CANONICAL_RECOMPUTE_EVENT = 'site_canonical.recompute' as const;

export class SiteCanonicalRecomputeEvent {
  constructor(readonly objectId: string) {}
}
