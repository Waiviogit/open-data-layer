/** Options when adding a new field row in the create workspace. */
export type AddFieldOptions = {
  /** Pre-select album for a new `imageGalleryItem` row. */
  galleryAlbum?: string;
  /** Pre-select category for a new `tagCategoryItem` row. */
  tagCategory?: string;
  /** Stable row id when the UI opens the editor immediately after add. */
  entryKey?: string;
};
