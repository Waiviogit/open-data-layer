import type { InjectionToken } from '@nestjs/common';

/** Kysely ODL handle; register with `useExisting: KYSELY` from each app. */
export const CURRENCY_DATABASE: InjectionToken = Symbol('currency.database');
