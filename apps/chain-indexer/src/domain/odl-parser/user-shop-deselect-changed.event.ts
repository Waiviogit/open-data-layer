/** Emitted after `user_shop_deselect` gains or loses a row for `account`. */
export const USER_SHOP_DESELECT_CHANGED_EVENT = 'user_shop_deselect.changed';

export class UserShopDeselectChangedEvent {
  constructor(readonly account: string) {}
}
