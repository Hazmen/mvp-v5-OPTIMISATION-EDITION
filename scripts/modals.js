// ===== Settings panel =====
const toggle = document.getElementById('settingsToggle');
const panel = document.getElementById('settingsPanel');

toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.classList.toggle('active');
});

// ===== Search modal =====
const modal = document.getElementById('modal');
const searchBtn = document.querySelector('.search');
let modal1Act = false;

searchBtn.onclick = (e) => {
    e.stopPropagation();

    // Keep only one modal open at a time.
    if (modal2Act) {
        modal2.classList.remove('show');
        modal2Act = false;
    }

    modal.classList.toggle('show');
    modal1Act = modal.classList.contains('show');
};

// ===== Speed modal =====
const modal2 = document.getElementById('speedModal');
const openBtn2 = document.querySelector('.speedometer');
let modal2Act = false;

if (openBtn2 && modal2) {
    openBtn2.onclick = (e) => {
        e.stopPropagation();

        // Keep only one modal open at a time.
        if (modal1Act) {
            modal.classList.remove('show');
            modal1Act = false;
        }

        modal2.classList.toggle('show');
        modal2Act = modal2.classList.contains('show');
    };
}

// ===== Close on outside click =====
document.addEventListener('click', (e) => {
    const selectWrapNode = document.getElementById('selectWrap');
    const isClickInsideSelect =
        selectWrapNode &&
        (selectWrapNode.contains(e.target) || e.target.closest('.dropdown'));

    if (!modal.contains(e.target) && !searchBtn.contains(e.target) && !isClickInsideSelect) {
        modal.classList.remove('show');
        modal1Act = false;
    }

    if (!modal2.contains(e.target) && !openBtn2.contains(e.target)) {
        modal2.classList.remove('show');
        modal2Act = false;
    }

    if (!panel.contains(e.target) && !toggle.contains(e.target)) {
        panel.classList.remove('active');
    }
});

// ===== Select logic =====
const selectWrap = document.getElementById('selectWrap');
const selectBtn = document.getElementById('selectBtn');
const selectValue = document.getElementById('selectValue');
const dropdown = selectWrap.querySelector('.dropdown');

selectBtn.onclick = () => {
    selectWrap.classList.toggle('open');
};

dropdown.querySelectorAll('div').forEach((item) => {
    item.onclick = () => {
        selectValue.textContent = item.dataset.value;
        selectWrap.classList.remove('open');
    };
});

// ===== Numeric input only =====
const numInput = document.getElementById('numInput');
numInput.addEventListener('beforeinput', (e) => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
    }
});
