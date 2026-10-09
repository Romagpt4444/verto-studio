# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro + TypeScript, собственный CSS на токенах (`@layer`), Three.js, GSAP + ScrollTrigger, Lenis, lottie-web (`lottie_light`). Деплой: GitHub Actions → GitHub Pages, домен vertostudio.ru (`CNAME`). Источник: `TZ-VERTO-ROCKET.md`, раздел 6.

## Users

Владельцы малого и среднего бизнеса в России, которым нужен сайт, лендинг, интернет-магазин или Telegram-бот. Не дизайнеры и не программисты: термины им ничего не говорят. Заходят чаще с телефона, по ссылке из Telegram или Instagram.

## Product Purpose

Сайт-визитка Verto Studio. За 10 секунд человек понимает, кто мы, что делаем и как написать. Успех — человек открывает Telegram-чат @Verto_Studio. Портфолио работает как доказательство, а не как главный смысл.

## Positioning

Сайт сам по себе — пример работы студии: живой, анимированный 3D-полёт ракеты Verto-1, который при этом быстрый, понятный и читается без JS.

## Operating Context

Главное действие — написать в Telegram. Запасные пути: WhatsApp (+7 993 535-86-96), Instagram (@verto_studio.ru), канал @VertoStudio_ru. Форм на сайте нет. Цены не публикуются: цена индивидуальна и зависит от объёма.

## Capabilities and Constraints

- Две версии: RU (`/`) и EN (`/en/`). Кейсы, демо и правовые страницы только на русском.
- Без форм с персональными данными, аналитики, сторонних скриптов и CDN.
- Демо-сайты `projects/*` не меняются.
- Публикация в `main` только после «ок» владельца.

## Brand Commitments

- Имя: Verto Studio. Ракета на сайте: VERTO-1, логотип V.
- Фон продолжает прежний тёмно-синий `#071426` (новый `--space-950`), один акцент «Зажигание» `#FF6B2C`.
- Шрифты: Unbounded (заголовки), Golos Text (текст), JetBrains Mono (приборные подписи).
- Тексты финальные: `claude-code-brief/content/ru.json`, `en.json`.

## Evidence on Hand

11 работ: 2 коммерческих кейса (THE WESHALKA, Master Tyres), 3 собственных продукта (Verto Lead Agent, Verto Lead Desk, Отклик), 6 концепций (Morrow Coffee, APEX Detailing, FORMA ESTATE, AUREN Dental, NORD Cabin, NOIR Golf). Превью — `assets/portfolio/`, `assets/the-weshalka/`, `assets/master-tires/`, `assets/lead-desk/`.

Нет и не выдумывать: отзывов, логотипов клиентов, цифр результатов, «лет опыта», цен.

## Product Principles

1. Один призыв: написать в Telegram. Всё остальное — запасные пути.
2. Обычные слова вместо терминов. Никаких обещаний роста продаж.
3. Движение помогает читать, а не мешает: без JS и при reduced motion сайт полный и красивый.
4. Скорость — часть дизайна: LCP-элемент — текст, 3D грузится после первой отрисовки.

## Accessibility & Inclusion

WCAG 2.1 AA: контраст ≥ 4.5:1, видимый фокус, полная клавиатурная навигация, `prefers-reduced-motion` и ручная кнопка «Остановить анимацию».
