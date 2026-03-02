let inpValue = 0n;
let isComputing = false;
let computationResult = null;
let isRunning = false;
let currentStepIndex = 0;
let currentDisplayedMax = null;
let userScrolled = false;

const worker = new Worker('./webWorker/collatz.worker.js');
const chartWorker = new Worker('./webWorker/chart.worker.js');



let visibleItems = []


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

const errorAudio = new Audio('assets/audio/error.m4a');
errorAudio.preload = 'auto';
errorAudio.volume = 1;

const speedSliders = document.querySelectorAll('.calc-speed');
let curspeedElements = document.querySelectorAll('.speed-value');

let delay = 10;
const speedMap = {
    '5': 1,
    '4': 10,
    '3': 100,
    '2': 300,
    '1': 750
};

function updateSpeedDisplay() {
    curspeedElements = document.querySelectorAll('.speed-value');
    curspeedElements.forEach(element => {
        element.innerText = delay + ' ms';
    });
}

speedSliders.forEach(slider => {
    slider.addEventListener('input', (event) => {
        const sliderValue = event.target.value;
        if (speedMap.hasOwnProperty(sliderValue)) {
            delay = speedMap[sliderValue];
            speedSliders.forEach(s => {
                if (s !== event.target) {
                    s.value = sliderValue;
                }
            });
            updateSpeedDisplay();
        }
    });
});

speedSliders.forEach(slider => {
    slider.value = '4';
});
updateSpeedDisplay();




copyBtn.addEventListener('click', () => {
    if (computationResult && computationResult.spisok) {
        const textToCopy = computationResult.spisok.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Optional: Show feedback to user
            copyLabel.textContent = 'Copied!';
            setTimeout(() => {
                copyLabel.textContent = 'Copy';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    } else {
        // Handle case when there's no computation result
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

//     handle.style.cursor = 'grab';

//     handle.addEventListener('pointerdown', e => {
//         dragging = true;
//         handle.setPointerCapture(e.pointerId);
//         handle.style.cursor = 'grabbing';

//         startX = e.clientX - currentX;
//         startY = e.clientY - currentY;
//     });

//     handle.addEventListener('pointermove', e => {
//         if (!dragging) return;

//         currentX = e.clientX - startX;
//         currentY = e.clientY - startY;

//         win.style.transform =
//             `translate(-50%, -50%) translate3d(${currentX}px, ${currentY}px, 0) scale(1)`;
//     });

//     handle.addEventListener('pointerup', stop);
//     handle.addEventListener('pointercancel', stop);

//     function stop() {
//         dragging = false;
//         handle.style.cursor = 'grab';
//     }
// }



/* ==========================
   СОЗДАНИЕ ОКНА
========================== */

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

    // ===== positioning =====
    win.style.position = 'fixed';
    win.style.left = '50%';
    win.style.top = '50%';
    win.style.transform = 'translate(-50%, -50%) scale(0.001)';
    win.style.zIndex = '10000';
    win.style.willChange = 'transform';
    win.style.backfaceVisibility = 'hidden';

    document.body.appendChild(win);

    // 🔥 ПРИНУДИТЕЛЬНЫЙ LAYOUT (КЛЮЧ)
    win.getBoundingClientRect();

    // ===== open animation =====
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

    // ===== close logic =====
    const okBtn = win.querySelector('.ok-btn');
    setTimeout(() => {closeWindow(win)}, 2500);
    okBtn.addEventListener('click', () => closeWindow(win));
}

/* ==========================
   CLOSE (SMOOTH)
========================== */

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

let playMode = true;
function changeMainButtonMode(playMode) {
    if (playMode) {
        return start.innerHTML = '<img src="svgs/play3.svg" class="btn-img">';
    } else {
        return start.innerHTML = '<img src="svgs/pause2.svg" class="btn-img">';
    }
}

const fontSizeSet = document.getElementById('fontSizeSet');
let curFontSize = document.querySelector('.fontRangeArea p');

if (fontSizeSet) {
    fontSizeSet.addEventListener('input', () => {
        calcArea.style.fontSize = fontSizeSet.value + 'px';
        curFontSize.innerText = fontSizeSet.value + 'px';
    });
};

const resetButton = document.querySelector('.controller.reset');
let isResetted = false;
resetButton.addEventListener('click', () => {
    isResetted = true;
});

if (!inp || !start || !calcArea || !currentNumber || !stepsCount || !maxNumber || !firstNumberLengthBlock || !firstNumberDisplay) {
    console.error('Required elements not found!');
}

worker.onmessage = (e) => {
    computationResult = e.data;

    isComputing = false;
    currentStepIndex = 0;
    visibleItems = [];
    calcArea.innerHTML = '';

    // chart.clear(); // 🔥 важно
    // chartWorker.postMessage({
    //     spisok: computationResult.spisok
    // });

    changeMainButtonMode(false);
    isRunning = true;

    processDelayCalc(computationResult.spisok, delay);
};


calcArea.addEventListener('scroll', () => {
    // Проверяем, находится ли пользователь вблизи нижней части области прокрутки
    const isAtBottom = calcArea.scrollHeight - calcArea.scrollTop <= calcArea.clientHeight + 3;

    if (!isAtBottom) {
        userScrolled = true; // Пользователь прокрутил вверх
    } else {
        userScrolled = false; // Пользователь вернулся вниз
    }
});

function renderAllRemaining(list) {
    for (let i = currentStepIndex; i < list.length; i++) { // Исправляем начальный индекс для согласованности
        const num = list[i];

        const p = document.createElement('p');
        // Создаем span для индекса с классом
        const indexSpan = document.createElement('span');
        indexSpan.className = 'step-index';
        indexSpan.textContent = `${i}: `; // Добавляем индекс и двоеточие в span

        p.appendChild(indexSpan); // Добавляем span в p
        p.appendChild(document.createTextNode(num.toString())); // Добавляем текст числа после span
        p.style.whiteSpace = 'nowrap'; // Применяем стиль к p, чтобы предотвратить перенос
        calcArea.appendChild(p);
    }

    currentStepIndex = list.length + 1; // Обновляем currentStepIndex
    visibleItems = list.slice();

    if (list.length > 0) {
        currentNumber.textContent = list[list.length - 1].toString();
    }

    stepsCount.textContent = (list.length - 1).toString();
    maxNumber.textContent = computationResult.max.toString();

    isRunning = false;
    changeMainButtonMode(true);

    // AUTO-SCROLL ADDITION
    // Прокручиваем вниз только если пользователь не прокручивал вручную
    if (!userScrolled) {
        calcArea.scrollTop = calcArea.scrollHeight;
    }
    // END AUTO-SCROLL ADDITION
};

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

    if (
        currentDisplayedMax === null ||
        currentNum > currentDisplayedMax
    ) {
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


const updateInpValue = () => {
    inpValue = BigInt(inp.value || '0');
    firstNumberLengthBlock.innerText = String(inpValue).length + ' digits';
    firstNumberDisplay.innerText = String(inpValue);

    if (inpValue == 0n) {
        firstNumberLengthBlock.innerText = String(inpValue).length - 1 + ' digits';
    }
};
updateInpValue();

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



inp.addEventListener('beforeinput', e => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
    }
});
inp.addEventListener('input', updateInpValue);



// ===== DOM helpers =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const $$$ = (id) => document.getElementById(id);

// ===== DOM elements =====
const randomBtn = $('.random-input');
const clearBtn = $('.clear-input');
const saveBtn = $('.save-input');
const input = $('.number-input');

// ===== constants =====
const MAX_RANDOM =
  9999999999999999999999999999999999999999999999999999999n;

// ===== random BigInt generator =====
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

// ===== events =====
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

