export const USER_OBJECT_POWERS_CREATE_EVENT = 'user_object_powers.create' as const;
export const USER_OBJECT_POWERS_UPDATE_EVENT = 'user_object_powers.update' as const;

export class UserObjectPowersCreateEvent {
  constructor(public readonly account: string) {}
}

export class UserObjectPowersUpdateEvent {
  constructor(
    public readonly account: string,
    public readonly delta: number,
  ) {}
}
