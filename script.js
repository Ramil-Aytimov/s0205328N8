"use strict";

// Адрес формы на formcarry.com: замените YOUR_FORM_ID на свой идентификатор
const FORM_ENDPOINT = "https://formcarry.com/s/YOUR_FORM_ID";
const STORAGE_KEY = "feedbackFormData";
const POPUP_HASH = "#feedback";
const FIELD_NAMES = ["fullname", "email", "phone", "organization", "message"];

function initFeedback() {
    const overlay = document.getElementById("popup");
    const openButton = document.getElementById("open-form");
    const closeButton = document.getElementById("close-form");
    const form = document.getElementById("feedback-form");
    const consent = document.getElementById("consent");
    const submitButton = document.getElementById("submit-button");
    const statusBox = document.getElementById("status");

    // Показ сообщения пользователю (type: info, success или error)
    function setStatus(message, type) {
        statusBox.textContent = message;
        statusBox.className = "status status-" + type;
        statusBox.hidden = message === "";
    }

    // LocalStorage: сохранение текущих значений формы
    function saveValues() {
        const data = {};

        FIELD_NAMES.forEach(function (name) {
            data[name] = form.elements[name].value;
        });
        data.consent = consent.checked;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (ignore) {
            // хранилище недоступно: форма работает без сохранения
        }
    }

    // LocalStorage: восстановление значений при загрузке страницы
    function restoreValues() {
        let data = null;

        try {
            data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch (ignore) {
            data = null;
        }
        if (!data) {
            return;
        }
        FIELD_NAMES.forEach(function (name) {
            if (typeof data[name] === "string") {
                form.elements[name].value = data[name];
            }
        });
        consent.checked = data.consent === true;
    }

    // LocalStorage: очистка после успешной отправки
    function clearSavedValues() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (ignore) {
            // нечего очищать
        }
    }

    // Показ и скрытие попапа (без изменения истории)
    function openPopup() {
        overlay.hidden = false;
        document.body.classList.add("no-scroll");
        form.elements.fullname.focus();
    }

    function closePopup() {
        overlay.hidden = true;
        document.body.classList.remove("no-scroll");
        setStatus("", "info");
        openButton.focus();
    }

    // History API: открытие формы добавляет запись в историю и меняет URL
    function showForm() {
        if (overlay.hidden) {
            history.pushState({popup: true}, "", POPUP_HASH);
            openPopup();
        }
    }

    // Закрытие формы возвращает на предыдущую запись истории
    function hideForm() {
        if (history.state && history.state.popup) {
            history.back();
        } else {
            closePopup();
        }
    }

    // Отправка данных на сервер без перезагрузки страницы
    function sendForm(event) {
        const payload = {};

        event.preventDefault();
        if (!form.reportValidity()) {
            return;
        }
        FIELD_NAMES.forEach(function (name) {
            payload[name] = form.elements[name].value.trim();
        });
        payload.consent = "yes";

        submitButton.disabled = true;
        setStatus("Отправка...", "info");

        fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            form.reset();
            clearSavedValues();
            setStatus("Спасибо! Сообщение отправлено.", "success");
        }).catch(function () {
            setStatus("Не удалось отправить сообщение. Попробуйте ещё раз позже.", "error");
        }).finally(function () {
            submitButton.disabled = false;
        });
    }

    openButton.addEventListener("click", showForm);
    closeButton.addEventListener("click", hideForm);

    // Клик по тёмному фону вне формы закрывает попап
    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
            hideForm();
        }
    });

    // Клавиша Escape закрывает попап
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !overlay.hidden) {
            hideForm();
        }
    });

    // Кнопки «Назад» и «Вперёд» в браузере открывают и закрывают форму
    window.addEventListener("popstate", function () {
        if (window.location.hash === POPUP_HASH) {
            openPopup();
        } else {
            closePopup();
        }
    });

    form.addEventListener("input", saveValues);
    form.addEventListener("change", saveValues);
    form.addEventListener("submit", sendForm);

    restoreValues();

    // Страница открыта по ссылке с #feedback: сначала сбрасываем адрес,
    // затем открываем форму обычным способом, чтобы «Назад» оставался на сайте
    if (window.location.hash === POPUP_HASH) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        showForm();
    }
}

document.addEventListener("DOMContentLoaded", initFeedback);
