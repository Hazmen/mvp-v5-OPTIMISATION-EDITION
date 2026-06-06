// ===== Mode configuration =====
const modes = [
    { id: 'sequence', name: 'Sequence' },
    { id: 'chart', name: 'Graph' },
    { id: 'chain', name: 'Chain' },
    { id: 'map', name: 'Map' }
];

let currentIndex = 0;
const totalModes = modes.length;

// ===== DOM elements =====
const modeLabel = document.querySelector('.modes-label');
const leftArrow = document.querySelector('.toogle-left');
const rightArrow = document.querySelector('.toogle-right');
const dotsContainer = document.getElementById('modes-dots');
const visModes = document.querySelectorAll('.vis-mode');

// ===== Dots =====
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

// ===== UI state =====
function updateMode(index) {
    const normalizedIndex = ((index % totalModes) + totalModes) % totalModes;

    modeLabel.textContent = modes[normalizedIndex].name;

    const dots = document.querySelectorAll('.mode-dot');
    dots.forEach((dot, dotIndex) => {
        if (dotIndex === normalizedIndex) {
            dot.style.backgroundColor = 'white';
            dot.style.borderColor = 'white';
            dot.style.transform = 'scale(1.0)';
        } else {
            dot.style.backgroundColor = 'transparent';
            dot.style.borderColor = 'rgba(195, 195, 195, 0.6)';
            dot.style.transform = 'scale(1)';
        }
    });

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

// ===== Navigation =====
leftArrow.addEventListener('click', () => {
    updateMode(currentIndex - 1);
});

rightArrow.addEventListener('click', () => {
    updateMode(currentIndex + 1);
});

// ===== Runtime styles =====
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

// ===== Init =====
createDots();
updateMode(0);

// ===== Keyboard support =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        leftArrow.click();
    } else if (e.key === 'ArrowRight') {
        rightArrow.click();
    }
});
