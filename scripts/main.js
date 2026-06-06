// ===== Runtime state =====
let inpValue = 0n;
let isComputing = false;
let computationResult = null;
let isRunning = false;
let currentStepIndex = 0;
let currentDisplayedMax = null;
let userScrolled = false;
let visibleItems = [];
let playMode = true;
let delay = 10;
let isResetted = false;

// ===== Workers =====
const worker = new Worker('./webWorker/collatz.worker.js');
const chartWorker = new Worker('./webWorker/chart.worker.js');

// ===== DOM references =====
const inp = document.querySelector('.number-input');
const start = document.querySelector('.start');
const calcArea = document.querySelector('.results-calculation-area');

const currentNumber = document.querySelector('.currentNumber');
const stepsCount = document.querySelector('.stepsCount');
const maxNumber = document.querySelector('.largestNum');
const firstNumberLengthBlock = document.querySelector('.firstNumberLength');
const firstNumberDisplay = document.querySelector('.firstNumber');
const skipThat = document.querySelector('.immediatly');
let copyBtn = document.querySelector('.copy-btn');
let copyLabel = document.querySelector('.copy-label');

// ===== Media =====
const errorAudio = new Audio('assets/audio/error.m4a');
errorAudio.preload = 'auto';
errorAudio.volume = 1;

// ===== Speed controls =====
const speedSliders = document.querySelectorAll('.calc-speed');
let curspeedElements = document.querySelectorAll('.speed-value');

const speedMap = {
    '5': 1,
    '4': 10,
    '3': 100,
    '2': 300,
    '1': 750
};

function updateSpeedDisplay() {
    curspeedElements = document.querySelectorAll('.speed-value');
    curspeedElements.forEach((element) => {
        element.innerText = delay + ' ms';
    });
}

speedSliders.forEach((slider) => {
    slider.addEventListener('input', (event) => {
        const sliderValue = event.target.value;

        if (speedMap.hasOwnProperty(sliderValue)) {
            delay = speedMap[sliderValue];

            speedSliders.forEach((linkedSlider) => {
                if (linkedSlider !== event.target) {
                    linkedSlider.value = sliderValue;
                }
            });

            updateSpeedDisplay();
        }
    });
});

speedSliders.forEach((slider) => {
    slider.value = '4';
});

updateSpeedDisplay();

// ===== Copy results =====
copyBtn.addEventListener('click', () => {
    if (computationResult && computationResult.spisok) {
        const textToCopy = computationResult.spisok.join('\n');

        navigator.clipboard.writeText(textToCopy).then(() => {
            copyLabel.textContent = 'Copied!';
            setTimeout(() => {
                copyLabel.textContent = 'Copy';
            }, 2000);
        }).catch((err) => {
            console.error('Failed to copy: ', err);
        });
    } else {
        copyLabel.textContent = 'No data';
        setTimeout(() => {
            copyLabel.textContent = 'Copy';
        }, 2000);
    }
});

// function makeDraggable(win, handle) {
//     let startX = 0;
//     let startY = 0;
//     let currentX = 0;
//     let currentY = 0;
//     let dragging = false;
//
//     handle.style.cursor = 'grab';
//
//     handle.addEventListener('pointerdown', e => {
//         dragging = true;
//         handle.setPointerCapture(e.pointerId);
//         handle.style.cursor = 'grabbing';
//
//         startX = e.clientX - currentX;
//         startY = e.clientY - currentY;
//     });
//
//     handle.addEventListener('pointermove', e => {
//         if (!dragging) return;
//
//         currentX = e.clientX - startX;
//         currentY = e.clientY - startY;
//
//         win.style.transform =
//             `translate(-50%, -50%) translate3d(${currentX}px, ${currentY}px, 0) scale(1)`;
//     });
//
//     handle.addEventListener('pointerup', stop);
//     handle.addEventListener('pointercancel', stop);
//
//     function stop() {
//         dragging = false;
//         handle.style.cursor = 'grab';
//     }
// }

// ===== Error window =====
function createErrorWindow() {
    errorAudio.currentTime = 0;
    errorAudio.play().catch(() => {});

    const win = document.createElement('div');
    win.id = 'errorWindow';

    win.innerHTML = `
        <div class="main-error-layer">
            <h2>Error</h2>
            <button class="close-error-win" draggable="true">
                <img src="../assets/windowControllers.jpg"
                     style="filter: contrast(.6); margin-right: 50px;"
                     width="120" height="32">
            </button>
        </div>

        <div class="second-error-layer">
            <div class="info-layer">
                <img src="../assets/error.png.jpg" width="38" height="38">
                <h3>Please enter a positive number.</h3>
            </div>

            <div class="ok-btn-div">
                <div class="ok-btn-cover">
                    <button class="ok-btn">OK</button>
                </div>
            </div>
        </div>
    `;

    win.style.position = 'fixed';
    win.style.left = '50%';
    win.style.top = '50%';
    win.style.transform = 'translate(-50%, -50%) scale(0.001)';
    win.style.zIndex = '10000';
    win.style.willChange = 'transform';
    win.style.backfaceVisibility = 'hidden';

    document.body.appendChild(win);
    win.getBoundingClientRect();

    win.animate(
        [
            { transform: 'translate(-50%, -50%) scale(0.001)' },
            { transform: 'translate(-50%, -50%) scale(1)' }
        ],
        {
            duration: 220,
            easing: 'cubic-bezier(.08, .9, .25, 1)',
            fill: 'forwards'
        }
    );

    // const header = win.querySelector('.main-error-layer');
    // makeDraggable(win, header);

    const okBtn = win.querySelector('.ok-btn');
    setTimeout(() => { closeWindow(win); }, 2500);
    okBtn.addEventListener('click', () => closeWindow(win));
}

function closeWindow(win) {
    win.style.willChange = 'transform';

    const anim = win.animate(
        [
            { transform: 'translate(-50%, -50%) scale(1)' },
            { transform: 'translate(-50%, -50%) scale(0.001)' }
        ],
        {
            duration: 100,
            easing: 'cubic-bezier(.45, 0, .55, .2)',
            fill: 'forwards'
        }
    );

    anim.onfinish = () => {
        win.style.willChange = '';
        win.remove();
    };
}

// ===== Main button state =====
function changeMainButtonMode(playMode) {
    if (playMode) {
        return start.innerHTML = '<img src="svgs/play3.svg" class="btn-img">';
    } else {
        return start.innerHTML = '<img src="svgs/pause2.svg" class="btn-img">';
    }
}

// ===== Font size setting =====
const fontSizeSet = document.getElementById('fontSizeSet');
let curFontSize = document.querySelector('.fontRangeArea p');

if (fontSizeSet) {
    fontSizeSet.addEventListener('input', () => {
        calcArea.style.fontSize = fontSizeSet.value + 'px';
        curFontSize.innerText = fontSizeSet.value + 'px';
    });
}

// ===== Reset button =====
const resetButton = document.querySelector('.controller.reset');
resetButton.addEventListener('click', () => {
    isResetted = true;
});

if (!inp || !start || !calcArea || !currentNumber || !stepsCount || !maxNumber || !firstNumberLengthBlock || !firstNumberDisplay) {
    console.error('Required elements not found!');
}

// ===== Worker result handling =====
worker.onmessage = (e) => {
    computationResult = e.data;

    isComputing = false;
    currentStepIndex = 0;
    visibleItems = [];
    calcArea.innerHTML = '';

    // chart.clear();
    // chartWorker.postMessage({
    //     spisok: computationResult.spisok
    // });

    changeMainButtonMode(false);
    isRunning = true;

    processDelayCalc(computationResult.spisok, delay);
};

// ===== Scroll tracking =====
calcArea.addEventListener('scroll', () => {
    const isAtBottom = calcArea.scrollHeight - calcArea.scrollTop <= calcArea.clientHeight + 3;

    if (!isAtBottom) {
        userScrolled = true;
    } else {
        userScrolled = false;
    }
});

// ===== Rendering =====
function renderAllRemaining(list) {
    for (let i = currentStepIndex; i < list.length; i++) {
        const num = list[i];
        const p = document.createElement('p');
        const indexSpan = document.createElement('span');

        indexSpan.className = 'step-index';
        indexSpan.textContent = `${i}: `;

        p.appendChild(indexSpan);
        p.appendChild(document.createTextNode(num.toString()));
        p.style.whiteSpace = 'nowrap';

        calcArea.appendChild(p);
    }

    currentStepIndex = list.length + 1;
    visibleItems = list.slice();

    if (list.length > 0) {
        currentNumber.textContent = list[list.length - 1].toString();
    }

    stepsCount.textContent = (list.length - 1).toString();
    maxNumber.textContent = computationResult.max.toString();

    isRunning = false;
    changeMainButtonMode(true);

    if (!userScrolled) {
        calcArea.scrollTop = calcArea.scrollHeight;
    }
}

function processDelayCalc(list) {
    if (!isRunning) return;

    if (currentStepIndex >= list.length) {
        isRunning = false;
        changeMainButtonMode(true);
        return;
    }

    const currentNum = list[currentStepIndex];

    if (currentNum === undefined) {
        console.error('Index overflow:', currentStepIndex);
        isRunning = false;
        return;
    }

    visibleItems.push(currentNum);

    const p = document.createElement('p');
    const indexSpan = document.createElement('span');

    indexSpan.className = 'step-index';
    indexSpan.textContent = `${currentStepIndex + 1}: `;

    p.appendChild(indexSpan);
    p.appendChild(document.createTextNode(currentNum.toString()));
    p.style.whiteSpace = 'nowrap';

    calcArea.appendChild(p);

    currentNumber.textContent = currentNum.toString();
    stepsCount.textContent = currentStepIndex.toString();

    if (currentDisplayedMax === null || currentNum > currentDisplayedMax) {
        currentDisplayedMax = currentNum;
        maxNumber.textContent = currentDisplayedMax.toString();
    }

    currentStepIndex++;

    if (!userScrolled) {
        calcArea.scrollTop = calcArea.scrollHeight;
    }

    setTimeout(() => {
        processDelayCalc(list);
    }, delay);
}

// ===== Input value sync =====
const updateInpValue = () => {
    inpValue = BigInt(inp.value || '');
    firstNumberLengthBlock.innerText = String(inpValue).length + ' digits';
    firstNumberDisplay.innerText = String(inpValue);

    if (inpValue == 0n) {
        firstNumberLengthBlock.innerText = String(inpValue).length - 1 + ' digits';
    }
};

updateInpValue();

// ===== Reset flow =====
resetButton.addEventListener('click', () => {
    isRunning = false;
    isComputing = false;

    computationResult = null;
    visibleItems = [];
    currentStepIndex = 0;
    currentDisplayedMax = null;

    calcArea.innerHTML = '';
    currentNumber.textContent = 'None';
    maxNumber.textContent = 'None';
    stepsCount.textContent = 'None';

    changeMainButtonMode(true);
});

// ===== Start and pause =====
start.addEventListener('click', () => {
    if (inp.value.trim() === '') {
        createErrorWindow();
        changeMainButtonMode(play);
    }

    const hasResult = computationResult !== null;
    const isFinished =
        hasResult &&
        currentStepIndex >= computationResult.spisok.length;

    if (!isRunning) {
        if (!hasResult || isFinished) {
            computationResult = null;
            visibleItems = [];
            currentStepIndex = 0;
            currentDisplayedMax = null;
            calcArea.innerHTML = '';
            currentNumber.textContent = 'None';
            maxNumber.textContent = 'None';
            stepsCount.textContent = 'None';

            isRunning = true;
            changeMainButtonMode(false);
            worker.postMessage(inpValue);
            return;
        }

        isRunning = true;
        changeMainButtonMode(false);
        processDelayCalc(computationResult.spisok);
        return;
    }

    isRunning = false;
    changeMainButtonMode(true);
});

skipThat.addEventListener('click', () => {
    if (!computationResult) return;

    isRunning = false;
    renderAllRemaining(computationResult.spisok);
});

inp.addEventListener('beforeinput', (e) => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
    }
});

inp.addEventListener('input', updateInpValue);

// ===== DOM helpers =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const $$$ = (id) => document.getElementById(id);

// ===== Input controls =====
const randomBtn = $('.random-input');
const clearBtn = $('.clear-input');
const saveBtn = $('.save-input');
const input = $('.number-input');

// ===== Constants =====
const MAX_RANDOM =
    9999999999999999999999999999999999999999999999999999999n;

// ===== Random BigInt generator =====
function randomBigInt(maxExclusive) {
    const digits = maxExclusive.toString().length;
    let result;

    do {
        let str = '';

        for (let i = 0; i < digits; i++) {
            str += Math.floor(Math.random() * 10);
        }

        result = BigInt(str);
    } while (result === 0n || result >= maxExclusive);

    return result;
}

// ===== Input actions =====
randomBtn.addEventListener('click', () => {
    const value = randomBigInt(MAX_RANDOM);
    input.value = value.toString();

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
});

clearBtn.addEventListener('click', () => {
    input.value = '';

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
});
