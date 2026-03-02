// ===== SETTINGS PANEL =====
const toggle = document.getElementById('settingsToggle');
const panel = document.getElementById('settingsPanel');

toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.classList.toggle('active');
});

// ===== MODAL 1 =====
const modal = document.getElementById('modal');
const searchBtn = document.querySelector('.search');
let modal1Act = false;

searchBtn.onclick = (e) => {
    e.stopPropagation();

    // Закрываем вторую модалку, если она открыта
    if (modal2Act) {
        modal2.classList.remove('show');
        modal2Act = false;
    }

    modal.classList.toggle('show');
    modal1Act = modal.classList.contains('show');
};

// ===== MODAL 2 =====
const modal2 = document.getElementById('speedModal');
const openBtn2 = document.querySelector('.speedometer');
let modal2Act = false;

if (openBtn2 && modal2) {
    openBtn2.onclick = (e) => {
        e.stopPropagation();

        // Закрываем первую модалку, если она открыта
        if (modal1Act) {
            modal.classList.remove('show');
            modal1Act = false;
        }

        modal2.classList.toggle('show');
        modal2Act = modal2.classList.contains('show');
    };
}

// ===== CLOSE ON OUTSIDE CLICK =====
document.addEventListener('click', (e) => {
    // Закрываем модалку 1
    // Добавляем проверку, не является ли клик внутри элементов, связанных с селектом
    const selectWrap = document.getElementById('selectWrap'); // Находим контейнер селекта
    const isClickInsideSelect = selectWrap && (selectWrap.contains(e.target) || e.target.closest('.dropdown')); // Проверяем, клик внутри селекта или выпадающего списка

    if (!modal.contains(e.target) && !searchBtn.contains(e.target) && !isClickInsideSelect) { // Добавляем !isClickInsideSelect
        modal.classList.remove('show');
        modal1Act = false;
    }

    // Закрываем модалку 2
    if (!modal2.contains(e.target) && !openBtn2.contains(e.target)) {
        modal2.classList.remove('show');
        modal2Act = false;
    }

    // Закрываем панель настроек
    if (!panel.contains(e.target) && !toggle.contains(e.target)) {
        panel.classList.remove('active');
    }
});

// ===== SELECT LOGIC (перенесено из старого скрипта) =====
// Находим элементы
const selectWrap = document.getElementById('selectWrap');
const selectBtn = document.getElementById('selectBtn');
const selectValue = document.getElementById('selectValue');
const dropdown = selectWrap.querySelector('.dropdown');

// Открытие/закрытие выпадающего списка
selectBtn.onclick = () => {
    selectWrap.classList.toggle('open');
};

// Выбор значения из списка
dropdown.querySelectorAll('div').forEach(item => {
    item.onclick = () => {
        selectValue.textContent = item.dataset.value;
        selectWrap.classList.remove('open');
    };
});

// ===== INPUT ONLY NUMBERS (перенесено из старого скрипта) =====
const numInput = document.getElementById('numInput');
numInput.addEventListener('beforeinput', e => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
    }
});