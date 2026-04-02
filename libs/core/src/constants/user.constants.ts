/**
 * Legacy Waivio user / referral enums (Mongo UserSchema).
 * @see tmp/UserSchema.js
 */

export const REFERRAL_TYPES = {
  REWARDS: 'rewards',
  REVIEWS: 'reviews',
  INVITE_FRIEND: 'invite_friend',
} as const;

export type ReferralType = (typeof REFERRAL_TYPES)[keyof typeof REFERRAL_TYPES];

export const REFERRAL_STATUSES = {
  NOT_ACTIVATED: 'notActivated',
  ACTIVATED: 'activated',
  REJECTED: 'rejected',
} as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[keyof typeof REFERRAL_STATUSES];

export const SUPPORTED_CURRENCIES = [
  'USD',
  'CAD',
  'EUR',
  'AUD',
  'MXN',
  'GBP',
  'JPY',
  'CNY',
  'RUB',
  'UAH',
  'CHF',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
