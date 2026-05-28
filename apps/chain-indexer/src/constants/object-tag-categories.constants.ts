/** Max resolved tagCategoryItem values stored per category after governance resolution. */
export const MAX_TAG_ITEMS_PER_CATEGORY = 10;

/** Default batch size when claiming `object_tag_categories_sync_queue` rows. */
export const OBJECT_TAG_CATEGORIES_WORKER_BATCH_SIZE = 20;

/** Seconds before a failed queue row can be claimed again. */
export const OBJECT_TAG_CATEGORIES_RETRY_AFTER_SEC = 60;

/** Interval name for SchedulerRegistry (tag category items worker). */
export const OBJECT_TAG_CATEGORIES_WORKER_INTERVAL_NAME = 'objectTagCategoriesWorker';
