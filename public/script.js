/* Verto Studio: progressive enhancement, native scroll and controlled motion. */
(() => {
  'use strict';
  const all = (s, root = document) => [...root.querySelectorAll(s)];
  const one = (s) => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 900px)');
  all('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const header = one('[data-header]');
  const updateHeader = () => header?.setAttribute('data-scrolled', scrollY > 12 ? '1' : '0');
  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });

  const toggle = one('[data-menu-toggle]');
  const nav = one('[data-navigation]');
  let menuOpen = false;
  const setMenu = (open, restore = true) => {
    menuOpen = open;
    if (!nav || !toggle) return;
    nav.dataset.open = open ? '1' : '0';
    nav.inert = mobile.matches && !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
    all('main, .site-footer').forEach(el => { el.inert = open; });
    if (open) nav.querySelector('a')?.focus({ preventScroll: true });
    else if (restore) toggle.focus({ preventScroll: true });
  };
  if (toggle && nav) {
    nav.inert = mobile.matches;
    toggle.addEventListener('click', () => setMenu(!menuOpen));
    all('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false, false)));
    mobile.addEventListener('change', () => setMenu(false, false));
    document.addEventListener('keydown', e => {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab') return;
      const items = [...all('a', nav), toggle];
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  if ('IntersectionObserver' in window && !reduced.matches) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    all('[data-reveal], [data-reveal-stagger]').forEach(el => {
      if (el.getBoundingClientRect().bottom < 0) el.classList.add('in');
      else io.observe(el);
    });
    document.documentElement.classList.add('js-motion');
  }

  const filters = all('.filter-tab');
  const rows = all('[data-project]');
  filters.forEach(tab => {
    tab.setAttribute('aria-pressed', String(tab.dataset.active === '1'));
    tab.addEventListener('click', () => {
      filters.forEach(t => {
        t.toggleAttribute('data-active', t === tab);
        if (t === tab) t.dataset.active = '1';
        t.setAttribute('aria-pressed', String(t === tab));
      });
      rows.forEach(row => { row.hidden = tab.dataset.filter !== 'all' && tab.dataset.filter !== row.dataset.kind; });
      const count = rows.filter(row => !row.hidden).length;
      const hint = one('.filter-hint');
      if (hint) { hint.setAttribute('aria-live', 'polite'); hint.textContent = `Работ: ${count}`; }
    });
  });

  const video = one('[data-motion-video]');
  const motionButton = one('[data-motion-toggle]');
  let userPaused = reduced.matches || !!navigator.connection?.saveData;
  let inView = true;
  const loadVideo = el => {
    const source = el.querySelector('source[data-src]');
    if (source && !source.hasAttribute('src')) { source.src = source.dataset.src; el.load(); }
  };
  const syncMotion = () => {
    if (!video) return;
    const play = !userPaused && inView && !document.hidden;
    if (play) { loadVideo(video); video.play().catch(error => { if (error.name !== 'AbortError') { userPaused = true; syncMotion(); } }); }
    else video.pause();
    motionButton?.setAttribute('aria-pressed', String(!userPaused));
    if (motionButton) motionButton.textContent = userPaused ? 'Включить движение' : 'Остановить движение';
    document.documentElement.classList.toggle('motion-paused', userPaused);
  };
  motionButton?.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncMotion(); }, { threshold: .1 }).observe(video);
  }
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', () => { userPaused = reduced.matches; syncMotion(); });
  syncMotion();

  const dialog = one('#reel-dialog');
  const reel = dialog?.querySelector('video');
  const opener = one('[data-reel-open]');
  opener?.addEventListener('click', () => {
    if (!dialog || !reel) return;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    loadVideo(reel);
    reel.play().catch(() => {});
  });
  one('[data-reel-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', e => {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    reel.pause();
    document.body.style.overflow = '';
    opener.focus();
  });

  const briefLink = one('[data-brief-link]');
  all('[data-brief]').forEach(button => button.addEventListener('click', () => {
    const active = button.getAttribute('aria-pressed') !== 'true';
    all('[data-brief]').forEach(b => b.setAttribute('aria-pressed', String(active && b === button)));
    const task = active ? button.dataset.brief : '';
    if (briefLink) briefLink.href = task ? `https://t.me/Verto_Studio?text=${encodeURIComponent('Здравствуйте! Хочу обсудить проект: ' + task + '. ')}` : 'https://t.me/Verto_Studio';
    const status = one('[data-brief-status]');
    if (status) status.textContent = task ? `«${task}» — добавим тему в черновик сообщения в Telegram.` : 'Начать можно с одного сообщения.';
  }));
})();
