const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

window.addEventListener("DOMContentLoaded", () => setTimeout(() => $(".loader").classList.add("is-hidden"), 900));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach(element => revealObserver.observe(element));

const menu = $('.menu');
const nav = $('.nav');
menu.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  nav.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
});
$$('.nav a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open'); nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false');
}));

const hero = $('.hero');
hero.addEventListener('mousemove', event => {
  if (window.innerWidth < 900) return;
  const box = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', `${((event.clientX - box.left) / box.width - .5) * 12}px`);
  hero.style.setProperty('--my', `${((event.clientY - box.top) / box.height - .5) * 8}px`);
});

window.addEventListener('scroll', () => document.documentElement.style.setProperty('--scroll', String(window.scrollY)), { passive: true });

const compare = $('.compare');
const range = $('.compare input');
range.addEventListener('input', () => compare.style.setProperty('--pos', `${range.value}%`));

const modal = $('.modal');
const modalForm = $('.modal__form');
const modalSuccess = $('.modal__success');
function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }
function openModal() { modal.hidden = false; modalForm.hidden = false; modalSuccess.hidden = true; document.body.style.overflow = 'hidden'; $('.modal input').focus(); }
$$('.js-book').forEach(button => button.addEventListener('click', openModal));
$('.modal__close').addEventListener('click', closeModal);
$('.modal__done').addEventListener('click', closeModal);
modal.addEventListener('mousedown', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
$('.modal form').addEventListener('submit', event => {
  event.preventDefault();
  modalForm.hidden = true;
  modalSuccess.hidden = false;
});

$$('.socials a').forEach(link => link.addEventListener('click', event => event.preventDefault()));
