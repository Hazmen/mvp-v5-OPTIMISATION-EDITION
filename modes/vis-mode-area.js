const modes = [
    { id: 'casual', title: 'Casual' },
    { id: 'linear', title: 'Linear chart' },
    { id: 'log', title: 'Log chart' },
    { id: 'map', title: 'Map' }
];

let currentModeIndex = 0;

const modeNameEl = document.getElementById('current-mode-name');
const dotsContainer = document.getElementById('modes-dots');
const modeBlocks = document.querySelectorAll('.vis-mode');

function createDots() {
    dotsContainer.innerHTML = '';

    modes.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('mode-dot');

        if (index === currentModeIndex) {
            dot.classList.add('active');
        }

        dot.addEventListener('click', () => {
            switchMode(index);
        });

        dotsContainer.appendChild(dot);
    });
}

function switchMode(newIndex) {
    if (newIndex < 0) newIndex = modes.length - 1;
    if (newIndex >= modes.length) newIndex = 0;

    const oldModeId = modes[currentModeIndex].id;
    const newModeId = modes[newIndex].id;

    const oldEl = document.querySelector(`[data-mode="${oldModeId}"]`);
    const newEl = document.querySelector(`[data-mode="${newModeId}"]`);

    if (!oldEl || !newEl) {
        console.error('Mode element not found:', oldModeId, newModeId);
        return;
    }

    oldEl.classList.remove('active');
    newEl.classList.add('active');

    modeNameEl.classList.add('switching');

    setTimeout(() => {
        modeNameEl.textContent = modes[newIndex].title;
        modeNameEl.classList.remove('switching');
    }, 100);

    currentModeIndex = newIndex;
    updateDots();
}



function updateDots() {
    document.querySelectorAll('.mode-dot')
        .forEach((dot, i) => {
            dot.classList.toggle('active', i === currentModeIndex);
        });
}

document.querySelectorAll('.mode-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        switchMode(currentModeIndex + dir);
    });
});

createDots();
switchMode(0);
