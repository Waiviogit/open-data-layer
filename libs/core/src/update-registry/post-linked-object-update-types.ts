import { UPDATE_TYPES } from './update-types';

/**
 * Update types loaded when resolving tagged objects for a full post (modal / article).
 * Wider than feed chips — includes rating, description, category items for linked-object cards.
 */
export const POST_LINKED_OBJECT_UPDATE_TYPES = [
  UPDATE_TYPES.NAME,
  UPDATE_TYPES.IMAGE,
  UPDATE_TYPES.DESCRIPTION,
  UPDATE_TYPES.AGGREGATE_RATING,
  UPDATE_TYPES.TAG_CATEGORY_ITEM,
] as const;

export type PostLinkedObjectUpdateType = (typeof POST_LINKED_OBJECT_UPDATE_TYPES)[number];
