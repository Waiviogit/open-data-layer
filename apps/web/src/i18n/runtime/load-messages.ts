import type { LocaleId, Messages } from '../types';
import { getOrLoadMessages } from './messages-cache';

const loaders: Record<LocaleId, () => Promise<Messages>> = {
  'en-US': () => import('../locales/en-US.json').then((m) => m.default),
  'id-ID': () => import('../locales/id-ID.json').then((m) => m.default),
  'ms-MY': () => import('../locales/ms-MY.json').then((m) => m.default),
  'ca-ES': () => import('../locales/ca-ES.json').then((m) => m.default),
  'cs-CZ': () => import('../locales/cs-CZ.json').then((m) => m.default),
  'da-DK': () => import('../locales/da-DK.json').then((m) => m.default),
  'de-DE': () => import('../locales/de-DE.json').then((m) => m.default),
  'et-EE': () => import('../locales/et-EE.json').then((m) => m.default),
  'es-ES': () => import('../locales/es-ES.json').then((m) => m.default),
  'fil-PH': () => import('../locales/fil-PH.json').then((m) => m.default),
  'fr-FR': () => import('../locales/fr-FR.json').then((m) => m.default),
  'hr-HR': () => import('../locales/hr-HR.json').then((m) => m.default),
  'it-IT': () => import('../locales/it-IT.json').then((m) => m.default),
  'hu-HU': () => import('../locales/hu-HU.json').then((m) => m.default),
  'pl-PL': () => import('../locales/pl-PL.json').then((m) => m.default),
  'pt-BR': () => import('../locales/pt-BR.json').then((m) => m.default),
  'ru-RU': () => import('../locales/ru-RU.json').then((m) => m.default),
  'uk-UA': () => import('../locales/uk-UA.json').then((m) => m.default),
  'ar-SA': () => import('../locales/ar-SA.json').then((m) => m.default),
  'hi-IN': () => import('../locales/hi-IN.json').then((m) => m.default),
  'ko-KR': () => import('../locales/ko-KR.json').then((m) => m.default),
  'ja-JP': () => import('../locales/ja-JP.json').then((m) => m.default),
  'af-ZA': () => import('../locales/af-ZA.json').then((m) => m.default),
  'zh-CN': () => import('../locales/zh-CN.json').then((m) => m.default),
};

export async function loadMessages(locale: LocaleId): Promise<Messages> {
  return getOrLoadMessages(locale, loaders[locale]);
}
