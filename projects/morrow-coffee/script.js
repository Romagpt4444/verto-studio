(() => {
  "use strict";
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-navigation]");

  const closeMenu = () => {
    if (!toggle || !navigation) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Открыть меню");
    navigation.classList.remove("is-open");
    body.classList.remove("menu-open");
  };

  if (toggle && navigation) {
    toggle.addEventListener("click", () => {
      const open = !navigation.classList.contains("is-open");
      navigation.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      body.classList.toggle("menu-open", open);
    });
    navigation
      .querySelectorAll("a")
      .forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const updateHeader = () =>
    header && header.classList.toggle("is-scrolled", window.scrollY > 36);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const items = [...document.querySelectorAll(".reveal")];
  if (
    "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    root.classList.add("has-reveal");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06 },
    );
    items.forEach((item) => observer.observe(item));
    window.setTimeout(
      () => items.forEach((item) => item.classList.add("is-visible")),
      2200,
    );
  }
})();
