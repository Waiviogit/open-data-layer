/**
 * Slim core object document for collection: objects_core.
 *
 * No embedded arrays. All updates and votes live in separate collections.
 * seq is incremented on every mutation to this object's data; used for
 * incremental projection updates and drift detection.
 */

export interface ObjectCoreDocument {
  objectId: string;
  objectType: string;
  creator: string;
  weight?: number;
  metaGroupId?: string;
  /** Incremented on every mutation; used for projection sync and reconciliation. */
  seq: number;
}
