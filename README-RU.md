# Verto Studio — сайт-визитка «Ракета Verto-1»

Главная страница vertostudio.ru (RU — `/`, EN — `/en/`): полёт 3D-ракеты VERTO-1 по прокрутке, бортовой паспорт, стек-ступени, коллекция из 11 работ, контакты. Кейсы, демо-сайты и правовые страницы — прежние статические HTML из `public/`.

Требования и решения: `TZ-VERTO-ROCKET.md` (ТЗ), `docs/DECISIONS.md` (отступления и причины), `DESIGN.md`, `PRODUCT.md`, `GATES.md` (критерии приёмки).

## Стек

Astro 7 + TypeScript, собственный CSS на токенах (`src/styles/`), Three.js (процедурная ракета), GSAP + ScrollTrigger, Lenis, lottie-web (`lottie_light`, стикеры Noto Emoji Animation). Всё локально, без CDN, аналитики и форм.

## Запуск

```bash
npm ci
npm run dev        # разработка, http://localhost:4321
npm run build      # проверка ключей i18n + сборка в dist/
npm run preview -- --port 4788   # просмотр сборки
```

Node ≥ 22.12 (проверено на 24).

## Где что лежит

- `src/i18n/ru.json`, `en.json` — все тексты страницы (ключи совпадают; `npm run build` падает при расхождении или при «зашитом» русском тексте в компонентах).
- `src/components/` — блоки страницы, `src/layouts/Base.astro` — `<head>`, мета, CSP, hreflang.
- `src/scripts/` — поведение: `main.ts` (вход), `scroll.ts` (Lenis + ScrollTrigger), `pins.ts`, `marquee.ts`, `stickers.ts`, `chrome.ts` (шапка, шкала высоты), `rocket/` (3D-сцена и хореография).
- `public/` — копируется как есть: старые страницы, `assets/`, `works/` (превью 640/1280), `stickers/`, `rocket/poster-hero.webp`, `og/`, шрифты, `robots.txt`, `llms.txt`, `CNAME`.
- Скрипты подготовки ассетов: `scripts/make-work-images.mjs`, `make-sticker-posters.mjs`, `make-rocket-poster.cjs` (нужен `npm run dev`), `make-og.cjs`.

## Проверки

Нужен `npm run build` и запущенный `npm run preview -- --port 4788`.

```bash
python3 scripts/site_qa.py            # статика dist/: ссылки, мета, hreflang, CSP, тексты i18n, редиректы
node scripts/browser_qa.cjs           # браузер: метки, контакты, фильтр, меню, стикеры, reduced motion, без WebGL/JS, кнопка анимации, консоль/CSP, первый экран, 8 ширин, скриншоты
node scripts/check-motion-rules.mjs   # запреты ТЗ 10.2
node scripts/check-contrast.mjs       # контраст отрисованных пар текста
node scripts/axe.cjs                  # axe-core WCAG 2.1 AA
node scripts/devices_qa.cjs           # WebKit (Safari iOS) и Chrome Android
node scripts/fps.cjs                  # FPS при прокрутке
./scripts/check-links.sh              # внешние ссылки
./scripts/lighthouse.sh               # Lighthouse 13, медиана из 3 прогонов → docs/lighthouse/
```

Отдельная проверка браузера: `node scripts/browser_qa.cjs --only=filter,menu`. Для WebKit старой сборки Playwright: `WEBKIT_PATH=~/Library/Caches/ms-playwright/webkit-2359/pw_run.sh node scripts/devices_qa.cjs`.

## Публикация

Сайт: `https://vertostudio.ru/` — репозиторий `Romagpt4444/verto-studio`, ветка `main`, GitHub Pages с источником **GitHub Actions** (включено 10.10.2026), домен из `public/CNAME`.

Каждый пуш в `main` запускает воркфлоу `.github/workflows/deploy.yml`: `npm ci` → `npm run build` → `python3 scripts/site_qa.py` → публикация `dist/`. Если проверка падает, сайт не обновляется. Pull request в `main` только собирает и проверяет, ничего не публикует. Вручную: Actions → Deploy to GitHub Pages → Run workflow.

Обновление: проверенная ветка сливается в `main` (fast-forward), пуш делает деплой. Пример: `git push upstream redesign/rocket:main`, где `upstream` — `Romagpt4444/verto-studio`.

## Откат

- Быстрый: `git revert <коммит слияния>` в `main` и снова запустить воркфлоу.
- Полный: ветка `backup/pre-rocket` — состояние до редизайна; копия папки — `../Verto-Studio-backup-2026-10-09`. Чтобы вернуть старый сайт: `git push upstream f9b5539:main --force-with-lease` — последний коммит `main` до редизайна. Воркфлоу опубликует его, если сборка проходит; старая версия лежала в корне, поэтому в крайнем случае переключите Pages на «Deploy from a branch → main / root».

## Лицензии

Шрифты Unbounded, Golos Text, JetBrains Mono — SIL OFL (`public/fonts/OFL-*.txt`). Иконки — Phosphor (MIT). Анимированные эмодзи — Noto Emoji Animation, Google, CC BY 4.0 (атрибуция в подвале).
