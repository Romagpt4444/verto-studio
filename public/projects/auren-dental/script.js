(() => {
  const body = document.body;
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const navigation = document.querySelector('[data-navigation]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const closeMenu = () => {
    body.classList.remove('menu-open');
    navigation?.classList.remove('is-open');
    toggle?.classList.remove('is-active');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Открыть меню');
  };

  toggle?.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');
    body.classList.toggle('menu-open', isOpen);
    toggle.classList.toggle('is-active', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  });

  navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const revealItems = document.querySelectorAll('.section-heading-margin, .values-grid article, .service-list article, .doctor-card, .clinic-grid figure, .result-card, .process-list li, .review-slider, .contact-form');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal', 'is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealItems.forEach((item) => observer.observe(item));
  }

  const slider = document.querySelector('[data-slider]');
  if (slider) {
    const reviews = [...slider.querySelectorAll('.review')];
    const dots = slider.querySelector('[data-slider-dots]');
    let active = 0;
    reviews.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Показать отзыв ${index + 1}`);
      dot.addEventListener('click', () => showReview(index));
      dots.append(dot);
    });
    const showReview = (index) => {
      active = (index + reviews.length) % reviews.length;
      reviews.forEach((review, reviewIndex) => review.classList.toggle('is-active', reviewIndex === active));
      dots.querySelectorAll('button').forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === active));
    };
    slider.querySelector('[data-slide-prev]')?.addEventListener('click', () => showReview(active - 1));
    slider.querySelector('[data-slide-next]')?.addEventListener('click', () => showReview(active + 1));
    showReview(0);
  }

  document.querySelector('[data-demo-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = event.currentTarget.querySelector('[data-form-status]');
    status.textContent = 'Спасибо! Это демонстрационная форма проекта Verto Studio.';
    event.currentTarget.reset();
  });
})();
