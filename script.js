const header = document.querySelector(".header");
const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector("#navigation");
const navLinks = document.querySelectorAll("#navigation a");
const form = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const year = document.querySelector("#current-year");


// =========================
// ТЕКУЩИЙ ГОД
// =========================

if (year) {
    year.textContent = new Date().getFullYear();
}


// =========================
// ШАПКА ПРИ ПРОКРУТКЕ
// =========================

function updateHeader() {
    if (!header) return;

    header.classList.toggle("scrolled", window.scrollY > 12);
}

updateHeader();

window.addEventListener("scroll", updateHeader, {
    passive: true
});


// =========================
// МОБИЛЬНОЕ МЕНЮ
// =========================

function closeMenu() {
    if (!menuButton || !navigation) return;

    navigation.classList.remove("is-open");

    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    menuButton.setAttribute(
        "aria-label",
        "Открыть меню"
    );

    document.body.classList.remove("menu-open");
}


if (menuButton && navigation) {

    menuButton.addEventListener("click", () => {

        const isOpen =
            navigation.classList.toggle("is-open");

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuButton.setAttribute(
            "aria-label",
            isOpen
                ? "Закрыть меню"
                : "Открыть меню"
        );

        document.body.classList.toggle(
            "menu-open",
            isOpen
        );
    });


    navLinks.forEach((link) => {

        link.addEventListener(
            "click",
            closeMenu
        );

    });


    window.addEventListener("resize", () => {

        if (window.innerWidth > 980) {
            closeMenu();
        }

    });
}


// =========================
// АНИМАЦИЯ БЛОКОВ
// =========================

const revealItems =
    document.querySelectorAll(".reveal");


if ("IntersectionObserver" in window) {

    const observer =
        new IntersectionObserver(

            (entries, currentObserver) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "visible"
                        );

                        currentObserver.unobserve(
                            entry.target
                        );
                    }

                });

            },

            {
                threshold: 0.12
            }

        );


    revealItems.forEach((item) => {

        observer.observe(item);

    });

} else {

    revealItems.forEach((item) => {

        item.classList.add("visible");

    });

}


// =========================
// FAQ
// =========================

const faqItems =
    document.querySelectorAll(".faq-item");


faqItems.forEach((item) => {

    item.addEventListener("toggle", () => {

        if (!item.open) return;


        faqItems.forEach((otherItem) => {

            if (otherItem !== item) {

                otherItem.open = false;

            }

        });

    });

});


// =========================
// ОШИБКИ ФОРМЫ
// =========================

function setFieldError(
    fieldName,
    message = ""
) {

    const input =
        document.querySelector(
            `#${fieldName}`
        );

    const error =
        document.querySelector(
            `[data-error-for="${fieldName}"]`
        );

    const field =
        input?.closest(".field");


    if (error) {

        error.textContent = message;

    }


    if (field) {

        field.classList.toggle(
            "has-error",
            Boolean(message)
        );

    }

}


// =========================
// ПРОВЕРКА ФОРМЫ
// =========================

function validateForm() {

    const name =
        document.querySelector("#name")
            ?.value.trim() ?? "";

    const contact =
        document.querySelector("#contact")
            ?.value.trim() ?? "";

    const project =
        document.querySelector("#project")
            ?.value.trim() ?? "";


    let isValid = true;


    setFieldError("name");
    setFieldError("contact");
    setFieldError("project");


    if (name.length < 2) {

        setFieldError(
            "name",
            "Введите имя — минимум 2 символа."
        );

        isValid = false;

    }


    if (contact.length < 3) {

        setFieldError(
            "contact",
            "Укажите Telegram или номер телефона."
        );

        isValid = false;

    }


    if (project.length < 10) {

        setFieldError(
            "project",
            "Расскажите о задаче немного подробнее."
        );

        isValid = false;

    }


    return {
        isValid,
        name,
        contact,
        project
    };

}


// =========================
// ОТПРАВКА ЗАЯВКИ
// =========================

if (form) {

    const fields =
        form.querySelectorAll(
            "input, textarea"
        );


    fields.forEach((field) => {

        field.addEventListener(
            "input",
            () => {

                setFieldError(field.id);

                if (formStatus) {

                    formStatus.textContent = "";

                    formStatus.classList.remove(
                        "visible"
                    );

                }

            }
        );

    });


    form.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            const data =
                validateForm();


            if (!data.isValid) {

                form.querySelector(
                    ".has-error input, .has-error textarea"
                )?.focus();

                return;

            }


            // Текст заявки

            const message =
`Здравствуйте! Хочу обсудить разработку сайта.

Имя: ${data.name}

Контакт: ${data.contact}

О проекте:
${data.project}

Заявка с сайта Verto Studio.`;


            const encodedMessage =
                encodeURIComponent(message);


            const telegramUrl =
                `https://t.me/Verto_Studio?text=${encodedMessage}`;


            // Сообщение на сайте

            if (formStatus) {

                formStatus.textContent =
                    "Открываем Telegram для отправки заявки...";

                formStatus.classList.add(
                    "visible"
                );

            }


            // Открываем Telegram

            window.open(
                telegramUrl,
                "_blank"
            );

        }
    );

}
