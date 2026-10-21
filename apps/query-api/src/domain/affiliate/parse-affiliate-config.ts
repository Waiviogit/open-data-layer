import {
  AFFILIATE_CODE_SCOPE,
  AFFILIATE_CODE_SCOPES,
  UPDATE_TYPES,
  type AffiliateCodeScope,
} from '@opden-data-layer/core';
import type { ResolvedObjectView, ResolvedUpdate } from '@opden-data-layer/objects-domain';
import { pickSingleImageDisplayUrlFromResolvedUpdate } from '../object-projection/image-display-url';
import type { AffiliateCodeEntry, AffiliateConfig } from './affiliate.types';

export type ParseAffiliateConfigOptions = {
  /** Shop/favorites owner. Their latest PERSONAL code is kept even if curator-rejected. */
  personalCreator?: string;
  /** Origin for `{ cid }` button images (`IPFS_CONTENT_BASE_URL`). */
  contentBaseUrl?: string;
};

function validUpdates(view: ResolvedObjectView, updateType: string): ResolvedUpdate[] {
  return (view.fields[updateType]?.values ?? []).filter(
    (u) => u.validity_status === 'VALID',
  );
}

function firstText(view: ResolvedObjectView, updateType: string): string | null {
  const text = validUpdates(view, updateType)[0]?.value_text?.trim();
  return text && text.length > 0 ? text : null;
}

function firstButtonImage(
  view: ResolvedObjectView,
  contentBaseUrl?: string,
): string | null {
  const row = validUpdates(view, UPDATE_TYPES.AFFILIATE_BUTTON)[0];
  if (!row) {
    return null;
  }
  return pickSingleImageDisplayUrlFromResolvedUpdate(row, contentBaseUrl);
}

function allTexts(view: ResolvedObjectView, updateType: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of validUpdates(view, updateType)) {
    const text = u.value_text?.trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    out.push(text);
  }
  return out;
}

function parseCodeEntry(update: ResolvedUpdate): AffiliateCodeEntry | null {
  const raw = update.value_json;
  if (!Array.isArray(raw) || raw.length < 2) {
    return null;
  }
  const scope = raw[0];
  if (typeof scope !== 'string' || !AFFILIATE_CODE_SCOPES.includes(scope as AffiliateCodeScope)) {
    return null;
  }
  const codes = raw.slice(1).filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
  if (codes.length === 0) {
    return null;
  }
  return {
    scope: scope as AffiliateCodeScope,
    creator: update.creator,
    codes,
  };
}

function collectCodes(
  view: ResolvedObjectView,
  personalCreator?: string,
): AffiliateCodeEntry[] {
  const codes = validUpdates(view, UPDATE_TYPES.AFFILIATE_CODE)
    .map(parseCodeEntry)
    .filter((e): e is AffiliateCodeEntry => e != null);

  const hasPersonal =
    personalCreator != null &&
    codes.some(
      (c) => c.scope === AFFILIATE_CODE_SCOPE.PERSONAL && c.creator === personalCreator,
    );
  if (personalCreator && !hasPersonal) {
    const latest = pickLatestPersonalCode(
      view.fields[UPDATE_TYPES.AFFILIATE_CODE]?.values ?? [],
      personalCreator,
    );
    if (latest) {
      codes.push(latest);
    }
  }
  return codes;
}

function pickLatestPersonalCode(
  values: ResolvedUpdate[],
  creator: string,
): AffiliateCodeEntry | null {
  const rows = values
    .filter((value) => value.creator === creator)
    .slice()
    .sort(compareUpdatesDesc);
  for (const row of rows) {
    const entry = parseCodeEntry(row);
    if (entry?.scope === AFFILIATE_CODE_SCOPE.PERSONAL) {
      return entry;
    }
  }
  return null;
}

function compareUpdatesDesc(a: ResolvedUpdate, b: ResolvedUpdate): number {
  if (b.created_at_unix !== a.created_at_unix) {
    return b.created_at_unix - a.created_at_unix;
  }
  if (a.event_seq === b.event_seq) {
    return 0;
  }
  return a.event_seq < b.event_seq ? 1 : -1;
}

export function parseAffiliateConfig(
  view: ResolvedObjectView,
  options?: ParseAffiliateConfigOptions,
): AffiliateConfig | null {
  const button = firstButtonImage(view, options?.contentBaseUrl);
  const urlTemplate = firstText(view, UPDATE_TYPES.AFFILIATE_URL_TEMPLATE);
  const productIdTypes = allTexts(view, UPDATE_TYPES.AFFILIATE_PRODUCT_ID_TYPES).map((t) =>
    t.toLowerCase(),
  );
  const geoAreas = allTexts(view, UPDATE_TYPES.AFFILIATE_GEO_AREA);
  const codes = collectCodes(view, options?.personalCreator);

  if (!button || !urlTemplate || productIdTypes.length === 0 || geoAreas.length === 0 || codes.length === 0) {
    return null;
  }

  return {
    objectId: view.object_id,
    button,
    urlTemplate,
    productIdTypes,
    geoAreas,
    codes,
  };
}

export function filterConfigsByScope(
  configs: AffiliateConfig[],
  scope: AffiliateCodeScope,
  creator?: string,
): AffiliateConfig[] {
  const out: AffiliateConfig[] = [];
  for (const config of configs) {
    const codes = config.codes.filter(
      (c) => c.scope === scope && (creator == null || c.creator === creator),
    );
    if (codes.length === 0) {
      continue;
    }
    out.push({ ...config, codes });
  }
  return out;
}
