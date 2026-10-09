// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = 'https://vertostudio.ru';

// Статические страницы из public/ (кейсы, демо, правовые) — тоже в sitemap.
const legacyPages = [
  '/cases/the-weshalka.html',
  '/cases/master-tyres.html',
  '/cases/lead-desk.html',
  '/lead-agent.html',
  '/projects/otklik/',
  '/projects/morrow-coffee/',
  '/projects/apex-detailing/',
  '/projects/forma-estate/',
  '/projects/auren-dental/',
  '/projects/nord-cabin/',
  '/projects/noir-golf/',
  '/privacy.html',
  '/terms.html',
  '/personal-data-consent.html',
].map((p) => site + p);

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' }, // CSS в HTML: минус один запрос до первой отрисовки
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false },
  },
  integrations: [
    sitemap({
      customPages: legacyPages,
      i18n: { defaultLocale: 'ru', locales: { ru: 'ru-RU', en: 'en-US' } },
      filter: (page) => !/\/(services|studio|projects)\.html$/.test(page) && !page.endsWith('/404/'),
    }),
  ],
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
