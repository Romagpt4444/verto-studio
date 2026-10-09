# Отчёт о проверках (фаза 7) — 9 октября 2026

Сборка: `npm run build` (Astro 7.3.8). Проверки против `npm run preview` на :4788. Повторить — команды в README.

| Проверка | Команда | Результат |
|---|---|---|
| Ключи RU/EN, тексты не «зашиты» | `node scripts/check-i18n.mjs` | I18N_OK (400 ключей) |
| Статика dist/: ссылки, мета, hreflang, CSP, все тексты i18n на странице, редиректы, sitemap, robots, llms.txt | `python3 scripts/site_qa.py` | SITE_QA_OK, 20 страниц |
| Метки типа у 11 работ | `browser_qa --only=labels` | LABELS_OK |
| Ссылки Telegram / WhatsApp / Instagram / канал, сноска Meta, бриф в Telegram | `--only=contacts` | CONTACTS_OK |
| Фильтр 11 / 2 / 3 / 6 + aria-live (RU, EN, телефон) | `--only=filter` | FILTER_OK |
| Мобильное меню: открытие, ловушка фокуса, Escape, закрытие по ссылке | `--only=menu` | MENU_OK |
| Стикеры: только на экране, ≤ 4 одновременно (1440 и 390) | `--only=stickers` | STICKERS_OK (максимум 4) |
| `prefers-reduced-motion`: нет прелоадера, Lenis, пинов, 3D; всё видно | `--only=reduced` | REDUCED_OK |
| Без WebGL — постер; без JS — весь текст и ссылки | `--only=fallbacks` | FALLBACKS_OK |
| Кнопка «Остановить анимацию» + запоминание | `--only=motiontoggle` | MOTIONTOGGLE_OK |
| Консоль и CSP: главная RU/EN с прокруткой + 11 старых страниц | `--only=console` | CONSOLE_OK (0 ошибок и предупреждений) |
| Первый экран на 375×667, 390×844, 768×1024, 1440×900, 1920×1080 | `--only=firstscreen` | FIRSTSCREEN_OK |
| Горизонтальная прокрутка 320–1920 (8 ширин, с анимацией и без) | `--only=overflow` | OVERFLOW_OK |
| Запреты ТЗ 10.2 | `node scripts/check-motion-rules.mjs` | MOTION_RULES_OK |
| Контраст отрисованных пар | `node scripts/check-contrast.mjs` | CONTRAST_OK, 966 пар, минимум 4.87:1 |
| axe-core WCAG 2.1 AA | `node scripts/axe.cjs` | AXE_OK, 0 нарушений (5 конфигураций) |
| Safari iOS (WebKit, iPhone 14), Chrome Android (Pixel 7) | `node scripts/devices_qa.cjs` | DEVICES_OK |
| Внешние ссылки | `./scripts/check-links.sh` | LINKS_OK (9 адресов, все 200) |
| FPS при прокрутке с 3D (Chrome, 1440×900) | `node scripts/fps.cjs` | 60 FPS в среднем, p95 кадра 17 мс |
| Худшие данные (break-ui), 320 px, шрифт 200 % | см. DECISIONS #38 | горизонтальной прокрутки нет |

## Lighthouse 13.5 (медиана из 3 прогонов, `docs/lighthouse/*.report.html`)

| Страница | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Мобильный RU | 98 | 100 | 100 | 100 | 2.2 с | 0.014 | 10 мс |
| Мобильный EN | 98 | 100 | 100 | 100 | 2.2 с | 0 | 10 мс |
| Десктоп RU | 100 | 100 | 100 | 100 | 0.5 с | 0.008 | 0 мс |
| Десктоп EN | 100 | 100 | 100 | 100 | 0.5 с | 0 | 0 мс |

## Вес

| Что | gzip | Бюджет ТЗ |
|---|---|---|
| JS до взаимодействия (main + gsap + ScrollTrigger + scroll) | 59 КБ | ≤ 90 КБ |
| 3D-пакет (Three.js + сцена), лениво | 151 КБ | ≤ 250 КБ |
| Lottie (лениво) | 47 КБ | — |
| Шрифты (10 файлов woff2) | 131 КБ | ≤ 150 КБ |
| HTML главной со встроенным CSS | 21 КБ | — |

## Осталось проверить вручную

- 60 FPS на реальном MacBook (Performance-запись DevTools) и плавность на среднем Android.
- Реальные iPhone (Safari) и Android: прогрев ракеты тапом, свайп-прокрутка горизонтальной ленты не применяется (на телефоне — список).
