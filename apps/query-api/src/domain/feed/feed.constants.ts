/** Update types loaded for tagged objects on feed cards (light resolution). */
export const FEED_OBJECT_UPDATE_TYPES = ['name', 'image'] as const;

/** Max object chips per post in feed cards (after sort: avatar first, then core weight). */
export const FEED_TAGGED_OBJECT_DISPLAY_LIMIT = 4;

export const FEED_EXCERPT_MAX_LENGTH = 300;

/** Max length for object description line on linked-object cards (after HTML strip). */
export const LINKED_OBJECT_DESCRIPTION_MAX = 200;

/** Max category_item labels shown on linked-object subtitle (most recent). */
export const LINKED_OBJECT_CATEGORY_ITEMS_MAX = 2;

export const FEED_PREVIEW_VOTER_DISPLAY = 3;
