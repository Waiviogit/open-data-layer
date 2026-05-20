import { MENU_ITEM_STYLES, UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { initialValueForDefinition } from './update-value-form.utils';
import { initialWalletAddressFormValue } from './wallet-address-form-value';

/** Default form state for a new menuItem update. */
export function initialMenuItemFormValue(): Record<string, unknown> {
  return {
    style: MENU_ITEM_STYLES[0],
    title: '',
    image: '',
  };
}

export type MenuItemLinkType = 'object' | 'web';

export function initialFormValueForUpdateType(updateType: string): unknown {
  if (updateType === UPDATE_TYPES.MENU_ITEM) {
    return initialMenuItemFormValue();
  }
  if (updateType === UPDATE_TYPES.WALLET_ADDRESS) {
    return initialWalletAddressFormValue();
  }
  const def = UPDATE_REGISTRY[updateType];
  return def ? initialValueForDefinition(def) : null;
}

/** Strip empty optional fields before Zod validation. */
export function sanitizeMenuItemFormValue(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  if (typeof out.title === 'string' && out.title.trim() === '') {
    delete out.title;
  }
  if (typeof out.image === 'string' && out.image.trim() === '') {
    delete out.image;
  }
  if (out.link_to_web === undefined || out.link_to_web === '') {
    delete out.link_to_web;
  }
  if (
    out.link_to_object === undefined ||
    (typeof out.link_to_object === 'string' && out.link_to_object.trim() === '')
  ) {
    delete out.link_to_object;
    delete out.object_type;
  }
  return out;
}

export function resolveMenuItemLinkType(value: Record<string, unknown>): MenuItemLinkType {
  if (typeof value.link_to_web === 'string' && value.link_to_web.trim().length > 0) {
    return 'web';
  }
  return 'object';
}
