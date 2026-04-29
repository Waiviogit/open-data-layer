/** Emitted when `post_objects` rows are added or replaced for an author (root post). */
export const POST_OBJECT_CHANGED_EVENT = 'post_object.changed';

export class PostObjectChangedEvent {
  constructor(readonly postAuthor: string) {}
}
