import ru from './ru.json';
import en from './en.json';

export type Lang = 'ru' | 'en';
export type Dict = typeof ru;

const dicts: Record<Lang, Dict> = { ru, en: en as Dict };

export const getDict = (lang: Lang): Dict => dicts[lang];

/** Подставляет {name} из vars. */
export const fmt = (s: string, vars: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

export const homePath = (lang: Lang): string => (lang === 'ru' ? '/' : '/en/');
export const otherLang = (lang: Lang): Lang => (lang === 'ru' ? 'en' : 'ru');
