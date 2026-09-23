(function () {
  'use strict';

  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  const dialog = document.querySelector('[data-dialog]');
  const dialogTitle = document.querySelector('[data-dialog-title]');
  const dialogCopy = document.querySelector('[data-dialog-copy]');
  const bookingSummary = document.querySelector('[data-booking-summary]');
  const selected = { date: 'Сегодня, 24 сентября', time: '10:00', suite: 'Suite 01', players: '2 игрока' };

  function updateHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function closeMenu() {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.classList.remove('is-open');
    body.classList.remove('menu-open');
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      mobileMenu.setAttribute('aria-hidden', String(open));
      mobileMenu.classList.toggle('is-open', !open);
      body.classList.toggle('menu-open', !open);
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  }

  function openDialog(title, copy) {
    if (!dialog) return;
    if (dialogTitle) dialogTitle.textContent = title || 'Demo booking';
    if (dialogCopy) dialogCopy.textContent = copy || 'Это демонстрационный интерфейс проекта Verto Studio. Реальная заявка никуда не отправляется.';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  document.querySelectorAll('[data-open-booking]').forEach(function (button) {
    button.addEventListener('click', function () { openDialog('Demo booking', 'Это демонстрационный интерфейс проекта Verto Studio. Реальная заявка никуда не отправляется.'); });
  });
  document.querySelectorAll('[data-open-membership]').forEach(function (button) {
    button.addEventListener('click', function () { openDialog('NOIR Membership', 'Демонстрационный запрос Membership. В реальном проекте здесь появится форма связи с клубом.'); });
  });
  document.querySelectorAll('[data-open-events]').forEach(function (button) {
    button.addEventListener('click', function () { openDialog('Private events', 'Демонстрационный запрос на мероприятие. Реальные данные не отправляются.'); });
  });
  document.querySelectorAll('[data-close-dialog]').forEach(function (button) { button.addEventListener('click', closeDialog); });
  if (dialog) dialog.addEventListener('click', function (event) { if (event.target === dialog) closeDialog(); });

  function renderSummary() {
    if (bookingSummary) bookingSummary.textContent = [selected.date, selected.time, selected.suite, selected.players].join(' / ');
  }
  document.querySelectorAll('[data-booking-option]').forEach(function (option) {
    option.addEventListener('click', function () {
      const group = option.dataset.group;
      document.querySelectorAll('[data-booking-option][data-group="' + group + '"]').forEach(function (item) {
        item.classList.remove('is-selected');
        if (item.getAttribute('role') === 'radio') item.setAttribute('aria-checked', 'false');
      });
      option.classList.add('is-selected');
      selected[group] = option.dataset.value;
      renderSummary();
    });
  });

  const suiteData = {
    '01': { kicker: 'SUITE 01 / THE CLASSIC', title: 'Точный удар.<br><em>Чистая игра.</em>', description: 'Private lounge, профессиональный TrackMan simulator и отдельный 55″ secondary display — всё необходимое для игры в своём темпе.', image: 'assets/images/hero.jpg', alt: 'Suite 01 — игровой зал с большим экраном', items: ['До 4 игроков', 'TrackMan simulator', 'Private lounge', '55″ secondary display'] },
    '02': { kicker: 'SUITE 02 / THE SOCIAL', title: 'Ваша компания.<br><em>Ваше поле.</em>', description: 'Больше пространства для друзей, команд и разговоров между ударами. Удобный формат для долгого вечера.', image: 'assets/images/lounge.jpg', alt: 'Suite 02 — приватная lounge-зона', items: ['До 6 игроков', 'TrackMan simulator', 'Lounge seating', 'Bar service on request'] },
    vip: { kicker: 'VIP SUITE / THE PRIVATE', title: 'Игра без<br><em>лишних слов.</em>', description: 'Увеличенная игровая зона, private bar и отдельная lounge-комната с персональным обслуживанием.', image: 'assets/images/events.jpg', alt: 'VIP Suite — пространство для закрытого события', items: ['До 8 гостей', 'Увеличенная игровая зона', 'Private bar', 'Персональный host'] }
  };
  const suiteImage = document.querySelector('[data-suite-image]');
  const suiteKicker = document.querySelector('[data-suite-kicker]');
  const suiteTitle = document.querySelector('[data-suite-title]');
  const suiteDescription = document.querySelector('[data-suite-description]');
  const suiteList = document.querySelector('[data-suite-list]');
  document.querySelectorAll('[data-suite]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      const data = suiteData[tab.dataset.suite];
      if (!data) return;
      document.querySelectorAll('[data-suite]').forEach(function (item) { item.classList.toggle('is-active', item === tab); item.setAttribute('aria-selected', String(item === tab)); });
      if (suiteImage) { suiteImage.style.opacity = '0'; window.setTimeout(function () { suiteImage.src = data.image; suiteImage.alt = data.alt; suiteImage.style.opacity = '1'; }, 140); }
      if (suiteKicker) suiteKicker.textContent = data.kicker;
      if (suiteTitle) suiteTitle.innerHTML = data.title;
      if (suiteDescription) suiteDescription.textContent = data.description;
      if (suiteList) suiteList.innerHTML = data.items.map(function (item) { return '<li>' + item + '</li>'; }).join('');
    });
  });

  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); currentObserver.unobserve(entry.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -30px' });
    revealItems.forEach(function (item) { observer.observe(item); });
  } else revealItems.forEach(function (item) { item.classList.add('is-visible'); });

  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { closeMenu(); closeDialog(); } });
})();
