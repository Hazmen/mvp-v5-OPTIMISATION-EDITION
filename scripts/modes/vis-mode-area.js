// Конфигурация режимов
const modes = [
    { id: 'sequence', name: 'Sequence' },
    { id: 'chart', name: 'Graph' },
    { id: 'chain', name: 'Chain' },
    { id: 'map', name: 'Map' }
];

let currentIndex = 0;
const totalModes = modes.length;

// Элементы DOM
const modeLabel = document.querySelector('.modes-label');
const leftArrow = document.querySelector('.toogle-left');
const rightArrow = document.querySelector('.toogle-right');
const dotsContainer = document.getElementById('modes-dots');
const visModes = document.querySelectorAll('.vis-mode');

// Создаём точки
function createDots() {
    dotsContainer.innerHTML = '';

    modes.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('mode-dot');

        if (index === 0) {
            dot.style.backgroundColor = 'white';
            dot.style.borderColor = 'white';
        } else {
            dot.style.backgroundColor = 'transparent';
            dot.style.borderColor = 'rgba(195, 195, 195, 0.6)';
        }

        dot.addEventListener('click', () => {
            updateMode(index);
        });

        dotsContainer.appendChild(dot);
    });
}

// Функция обновления интерфейса
function updateMode(index) {
    // Нормализуем индекс для бесконечной карусели
    const normalizedIndex = ((index % totalModes) + totalModes) % totalModes;

    // Обновляем текст
    modeLabel.textContent = modes[normalizedIndex].name;

    // Обновляем точки
    const dots = document.querySelectorAll('.mode-dot');
    dots.forEach((dot, i) => {
        if (i === normalizedIndex) {
            dot.style.backgroundColor = 'white';
            dot.style.borderColor = 'white';
            dot.style.transform = 'scale(1.0)';
        } else {
            dot.style.backgroundColor = 'transparent';
            dot.style.borderColor = 'rgba(195, 195, 195, 0.6)';
            dot.style.transform = 'scale(1)';
        }
    });

    // Обновляем видимый режим визуализации
    visModes.forEach((mode) => {
        const modeId = mode.dataset.mode;
        if (modeId === modes[normalizedIndex].id) {
            mode.style.display = 'block';
            mode.style.animation = 'fadeIn 0.3s ease';
        } else {
            mode.style.display = 'none';
        }
    });

    currentIndex = normalizedIndex;
}

// Обработчики стрелок
leftArrow.addEventListener('click', () => {
    updateMode(currentIndex - 1);
});

rightArrow.addEventListener('click', () => {
    updateMode(currentIndex + 1);
});

// Добавляем анимацию появления в CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0.3; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }

    .vis-mode {
        transition: opacity 0.3s ease;
    }
`;
document.head.appendChild(style);

// Инициализация
createDots();
updateMode(0);

// Обработка клавиатуры
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        leftArrow.click();
    } else if (e.key === 'ArrowRight') {
        rightArrow.click();
    }
});
