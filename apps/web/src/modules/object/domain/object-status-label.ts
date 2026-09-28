/** Venue types that show the left-rail "Permanently closed" location notice. */
export const OBJECT_STATUS_LOCATION_CLOSED_TYPES = [
  'business',
  'restaurant',
  'place',
  'shop',
] as const;

/** Object types that show "Discontinued" for `closed` status. */
export const OBJECT_STATUS_DISCONTINUED_TYPES = [
  'product',
  'service',
  'book',
  'drink',
  'dish',
  'service_offer',
  'service_request',
] as const;

const DEFAULT_STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'active',
  protected: 'object_status_protected',
  unavailable: 'unavailable',
  relisted: 'relisted',
  closed: 'object_status_permanently_closed',
  privacy_erasure: 'object_status_privacy_erasure',
  nsfw: 'append_form_NSFW',
  flagged: 'append_form_flagged',
};

/**
 * i18n key for a lifecycle `objects_core.status` value.
 * `closed` is type-dependent (permanently closed vs discontinued).
 */
export function objectStatusLabelKey(
  status: string,
  objectType?: string,
): string {
  if (status === 'closed') {
    const type = objectType?.trim().toLowerCase() ?? '';
    if (
      (OBJECT_STATUS_DISCONTINUED_TYPES as readonly string[]).includes(type)
    ) {
      return 'object_status_discontinued';
    }
    return 'object_status_permanently_closed';
  }
  return DEFAULT_STATUS_LABEL_KEYS[status] ?? 'status';
}

/** True when hero should show a lifecycle status badge. */
export function shouldShowObjectStatusBadge(status: string | null | undefined): boolean {
  const s = status?.trim();
  return Boolean(s && s !== 'active');
}

/** i18n key for the left-rail body under "Permanently closed" on venue listings. */
export function objectStatusClosedLocationBodyKey(): string {
  return 'object_status_closed_location_body';
}

/** True when the left rail should show the venue "Permanently closed" notice block. */
export function shouldShowPermanentlyClosedLocationNotice(
  status: string | null | undefined,
  objectType?: string,
): boolean {
  const s = status?.trim();
  if (s !== 'closed') {
    return false;
  }
  const type = objectType?.trim().toLowerCase() ?? '';
  return (OBJECT_STATUS_LOCATION_CLOSED_TYPES as readonly string[]).includes(type);
}
