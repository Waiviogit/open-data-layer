/** Max resolved category strings stored per object after `ObjectViewService`. */
export const MAX_CATEGORIES_PER_OBJECT = 15;

/** Default batch size when claiming `object_categories_sync_queue` rows. */
export const OBJECT_CATEGORIES_WORKER_BATCH_SIZE = 20;

/** Default batch size when claiming `object_categories_related_sync_queue` rows. */
export const OBJECT_CATEGORIES_RELATED_WORKER_BATCH_SIZE = 5;

/** Seconds before a failed queue row can be claimed again. */
export const OBJECT_CATEGORIES_RETRY_AFTER_SEC = 60;

/** Interval name for SchedulerRegistry (object categories worker). */
export const OBJECT_CATEGORIES_WORKER_INTERVAL_NAME = 'objectCategoriesWorker';

/** Interval name for SchedulerRegistry (related aggregation worker). */
export const OBJECT_CATEGORIES_RELATED_WORKER_INTERVAL_NAME =
  'objectCategoriesRelatedWorker';
