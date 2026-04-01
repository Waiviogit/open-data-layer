import type { locales } from '../config/locales';

export type LocaleConfig = (typeof locales)[number];
export type LocaleId = LocaleConfig['id'];

export type Messages = Readonly<Record<string, string>>;
