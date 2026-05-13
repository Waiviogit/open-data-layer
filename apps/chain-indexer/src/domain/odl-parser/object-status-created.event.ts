import type { ObjectStatus } from '@opden-data-layer/core';

export const OBJECT_STATUS_CREATED_EVENT = 'odl.object.status_created';

export class ObjectStatusCreatedEvent {
  constructor(
    public readonly objectId: string,
    public readonly creator: string,
    public readonly status: ObjectStatus,
  ) {}
}
