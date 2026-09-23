(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-navigation]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeMenu = () => {
    if (!menu || !nav) return;
    nav.classList.remove("is-open");
    nav.inert = window.innerWidth <= 820;
    body.classList.remove("menu-open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Открыть меню");
  };

  if (nav) nav.inert = window.innerWidth <= 820;
  menu?.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    nav.inert = !open;
    body.classList.toggle("menu-open", open);
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) {
      closeMenu();
      menu?.focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      nav && (nav.inert = false);
      closeMenu();
    } else if (nav && !nav.classList.contains("is-open")) nav.inert = true;
  }, { passive: true });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const modelData = {
    28: { label: "NORD 28 / COMPACT CABIN", title: "Маленький дом", accent: "для большой паузы.", description: "Пространство для двоих, коротких выходных и долгих завтраков у окна.", area: "28 м²", people: "до 2 человек", price: "от 3,9 млн ₽", image: "./assets/images/nord-28.jpg", alt: "NORD 28 среди северной природы" },
    46: { label: "NORD 46 / ALL-SEASON HOME", title: "Панорамный дом", accent: "для двоих и своих.", description: "Круглогодичный сценарий с кухней-гостиной, отдельной спальней и видом, который остаётся с вами.", area: "46 м²", people: "до 4 человек", price: "от 5,8 млн ₽", image: "./assets/images/hero.jpg", alt: "NORD 46 у воды в сосновом лесу" },
    72: { label: "NORD 72 / COUNTRY RESIDENCE", title: "Больше воздуха.", accent: "Больше времени вместе.", description: "Просторная резиденция для длинных выходных, семейных ритуалов и жизни в собственном ритме.", area: "72 м²", people: "до 6 человек", price: "от 8,4 млн ₽", image: "./assets/images/nord-72.jpg", alt: "NORD 72 на краю соснового леса" }
  };
  const tabs = [...document.querySelectorAll("[data-model]")];
  const modelImage = document.querySelector("[data-model-image]");
  const modelLabel = document.querySelector("[data-model-label]");
  const modelTitle = document.querySelector("[data-model-title]");
  const modelTitleAccent = document.querySelector("[data-model-title-accent]");
  const modelDescription = document.querySelector("[data-model-description]");
  const modelArea = document.querySelector("[data-model-area]");
  const modelPeople = document.querySelector("[data-model-people]");
  const modelPrice = document.querySelector("[data-model-price]");

  const selectModel = (key) => {
    const data = modelData[key];
    if (!data) return;
    tabs.forEach((tab) => {
      const active = tab.dataset.model === key;
      tab.classList.toggle("is-active", active);
      if (tab.getAttribute("role") === "tab") tab.setAttribute("aria-selected", String(active));
    });
    if (modelImage) {
      modelImage.style.opacity = "0";
      window.setTimeout(() => {
        modelImage.src = data.image;
        modelImage.alt = data.alt;
        modelImage.style.opacity = "1";
      }, reducedMotion ? 0 : 160);
    }
    if (modelLabel) modelLabel.textContent = data.label;
    if (modelTitle) modelTitle.textContent = data.title;
    if (modelTitleAccent) modelTitleAccent.textContent = data.accent;
    if (modelDescription) modelDescription.textContent = data.description;
    if (modelArea) modelArea.textContent = data.area;
    if (modelPeople) modelPeople.textContent = data.people;
    if (modelPrice) modelPrice.textContent = data.price;
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => selectModel(tab.dataset.model)));
  document.querySelectorAll("[data-model-target]").forEach((link) => link.addEventListener("click", () => selectModel(link.dataset.modelTarget)));

  document.querySelectorAll("details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      if (!detail.open) return;
      document.querySelectorAll(".faq-list details[open]").forEach((other) => {
        if (other !== detail) other.removeAttribute("open");
      });
    });
  });

  if (!reducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".nord-section-intro,.house-row,.principles-grid article,.process-list li,.interior-gallery figure,.kit-list,.nord-stats,.nord-faq-grid").forEach((item) => observer.observe(item));
  }
})();
