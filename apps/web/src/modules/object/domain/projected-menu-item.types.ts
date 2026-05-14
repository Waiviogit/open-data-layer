/** Embedded resolved target when `menuItem.link_to_object` was expanded by query-api. */
export type ProjectedMenuItemObject = {
  object_id: string;
  object_type: string;
  fields: Record<string, unknown>;
};

/**
 * Normalized menu row from projected `menuItem` updates (registry JSON shape + optional `object`).
 * Use `displayTitle` for UI; `title` is the raw chain value when present.
 */
export type ProjectedMenuItem = {
  /** Non-empty chain title when provided. */
  title?: string;
  /** Resolved label: title, or linked object name, or link fallback. */
  displayTitle: string;
  style: string;
  image?: string;
  link_to_object?: string;
  object_type?: string;
  link_to_web?: string;
  object?: ProjectedMenuItemObject;
};
