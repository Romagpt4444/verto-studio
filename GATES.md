# Gates: редизайн «Ракета Verto-1»

Критерии приёмки (unlazy) = раздел 20 ТЗ. Ручные гейты подтверждаются скриншотами в `docs/screens/`.

## Дерево задач

- Фаза 0 — подготовка (ветка, бэкап, скиллы, документы)
- Фаза 1 — каркас Astro, public/, токены, шрифты, i18n, якоря, воркфлоу
- Фаза 2 — все блоки и тексты RU/EN без анимаций, адаптив 320–1920, без JS
- Фаза 3 — движение: Lenis, ScrollTrigger, появления, лента, счётчики, фильтр, меню, магнит, шкала, прелоадер
- Фаза 4 — 3D-ракета: модель, пламя, пар, звёзды, орбиты, постер, ленивая загрузка, прогрев, качество
- Фаза 5 — хореография по 9.3
- Фаза 6 — стикеры Noto, spotlight, блик, полировка
- Фаза 7 — качество: Lighthouse, axe, QA-скрипты, ссылки, OG, sitemap, CSP
- Фаза 8 — отчёт, предпросмотр, ожидание «ок»

## Смысл

- [ ] G1 Сборка проходит без ошибок
  CHECK: npm run build
  EXPECT: Complete!
- [ ] G2 Ключи RU и EN совпадают, нет зашитых строк вне i18n
  CHECK: node scripts/check-i18n.mjs
  EXPECT: I18N_OK
- [ ] G3 Первый экран (375×667, 390×844, 768×1024, 1440×900, 1920×1080): VERTO STUDIO, цитата, оффер, кнопка, ряд контактов — manual (скриншоты phase-2/phase-7)
- [ ] G4 У всех 11 работ видна метка типа
  CHECK: node scripts/browser_qa.cjs --only=labels
  EXPECT: LABELS_OK

## Функции

- [ ] G5 Ссылки Telegram/WhatsApp/Instagram/канал, сноска про Meta, бриф подставляет текст
  CHECK: node scripts/browser_qa.cjs --only=contacts
  EXPECT: CONTACTS_OK
- [ ] G6 Фильтр 11 / 2 / 3 / 6 с aria-live
  CHECK: node scripts/browser_qa.cjs --only=filter
  EXPECT: FILTER_OK
- [ ] G7 RU ↔ EN с якорем, lang и hreflang
  CHECK: python3 scripts/site_qa.py
  EXPECT: SITE_QA_OK
- [ ] G8 Старые URL открываются, services/studio/projects редиректят
  CHECK: python3 scripts/site_qa.py
  EXPECT: SITE_QA_OK
- [ ] G9 Мобильное меню: открытие, Escape, ловушка фокуса, закрытие по ссылке
  CHECK: node scripts/browser_qa.cjs --only=menu
  EXPECT: MENU_OK

## Анимация

- [ ] G10 Ракета: старт, прогрев, взлёт, поворот, 2 ступени, дальний план, орбита, посадка — manual (скриншоты phase-5)
- [ ] G11 Лента влево, ускорение от скролла, пауза при наведении — manual
- [ ] G12 Стикеры только на видимых карточках, ≤ 4 одновременно
  CHECK: node scripts/browser_qa.cjs --only=stickers
  EXPECT: STICKERS_OK
- [ ] G13 Reduced motion: нет прелоадера, постер, нет пинов
  CHECK: node scripts/browser_qa.cjs --only=reduced
  EXPECT: REDUCED_OK
- [ ] G14 Без WebGL — постер; без JS — весь текст и ссылки
  CHECK: node scripts/browser_qa.cjs --only=fallbacks
  EXPECT: FALLBACKS_OK
- [ ] G15 Кнопка «Остановить анимацию» работает и запоминается
  CHECK: node scripts/browser_qa.cjs --only=motiontoggle
  EXPECT: MOTIONTOGGLE_OK
- [ ] G16 Нет transition: all, scale(0), ease-in, анимаций width/height/top/left
  CHECK: node scripts/check-motion-rules.mjs
  EXPECT: MOTION_RULES_OK

## Качество

- [ ] G17 Lighthouse мобильный RU и EN: Perf ≥ 85, A11y ≥ 95, BP 100, SEO 100, LCP ≤ 2.5 с, CLS ≤ 0.05 — manual (отчёты docs/lighthouse/)
- [ ] G18 Контраст текстовых пар ≥ 4.5:1
  CHECK: node scripts/check-contrast.mjs
  EXPECT: CONTRAST_OK
- [ ] G19 Консоль без ошибок и CSP-предупреждений
  CHECK: node scripts/browser_qa.cjs --only=console
  EXPECT: CONSOLE_OK
- [ ] G20 Нет горизонтальной прокрутки 320–1920
  CHECK: node scripts/browser_qa.cjs --only=overflow
  EXPECT: OVERFLOW_OK
- [ ] G21 60 FPS при скролле на MacBook — manual
- [ ] G22 Атрибуция Noto CC BY 4.0 в подвале
  CHECK: python3 scripts/site_qa.py
  EXPECT: SITE_QA_OK
- [ ] G23 docs/DECISIONS.md содержит отступления — manual
- [ ] G24 README обновлён — manual
