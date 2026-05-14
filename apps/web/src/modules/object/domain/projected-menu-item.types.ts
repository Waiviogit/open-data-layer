/** Normalized menu row from projected `menuItem` updates (registry JSON shape). */
export type ProjectedMenuItem = {
  title: string;
  style: string;
  image?: string;
  link_to_object?: string;
  object_type?: string;
  link_to_web?: string;
};
