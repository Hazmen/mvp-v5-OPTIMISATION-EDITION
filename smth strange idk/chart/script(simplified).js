// ======================================================
// COLLATZ VISUALIZER
// Упрощённая и подробно прокомментированная версия
// ======================================================



// ------------------------------------------------------
// 1. Получаем элементы интерфейса
// ------------------------------------------------------
const inputEl = document.getElementById('input');
const runButton = document.getElementById('runBtn');
const graphContainer = document.getElementById('chart');



// ------------------------------------------------------
// 2. Глобальное состояние
// ------------------------------------------------------
// Сейчас ли включён логарифмический режим графика
let isLogScaleEnabled = false;

// Последняя посчитанная последовательность Коллатца
let currentSequence = [];

// Экземпляры графиков
let lineChart;
let pieChart;



// ------------------------------------------------------
// 3. Переключение масштаба графика
// ------------------------------------------------------
// mode может быть 'linear' или 'log'
function setScale(mode) {
    isLogScaleEnabled = (mode === 'log');

    // Обновляем активные кнопки масштаба
    document.getElementById('btnLinear')
        .classList.toggle('active', !isLogScaleEnabled);

    document.getElementById('btnLog')
        .classList.toggle('active', isLogScaleEnabled);

    // Если последовательность уже есть — перерисовываем график
    if (currentSequence.length > 0) {
        renderGraph(currentSequence, isLogScaleEnabled);
    }
}



// ------------------------------------------------------
// 4. Ограничение ввода: только цифры
// ------------------------------------------------------
// beforeinput срабатывает до вставки символа в input.
// Если пользователь пытается ввести не цифру — запрещаем.
inputEl.addEventListener('beforeinput', function (event) {
    if (event.data && !/^[0-9]+$/.test(event.data)) {
        event.preventDefault();
    }
});



// ------------------------------------------------------
// 5. Построение последовательности Коллатца через BigInt
// ------------------------------------------------------
// Почему BigInt?
// Потому что обычный Number в JS ломается на очень больших числах.
// А здесь мы хотим работать даже с огромными значениями.
//
// Правила Collatz:
// - если число чётное: n = n / 2
// - если нечётное:     n = n * 3 + 1
//
// Возвращаем массив BigInt.
function collatzBigInt(startValue) {
    const sequence = [];

    // Для 0 просто возвращаем пустой массив
    if (startValue === 0n) {
        return sequence;
    }

    let current = startValue;

    while (true) {
        sequence.push(current);

        // Если дошли до 1 — останавливаемся
        if (current === 1n) {
            break;
        }

        // Вычисляем следующий элемент
        if (current % 2n === 0n) {
            current = current / 2n;
        } else {
            current = current * 3n + 1n;
        }

        // Защита от слишком длинной последовательности
        if (sequence.length > 50000) {
            break;
        }
    }

    return sequence;
}



// ------------------------------------------------------
// 6. Точный log10 для BigInt
// ------------------------------------------------------
// Проблема:
// Math.log10 умеет работать только с Number.
// Но BigInt может быть настолько большим, что Number его не вместит.
//
// Идея:
// - переводим число в строку
// - берём первые 15 цифр
// - добавляем поправку на длину числа
//
// Пример:
// 12345678901234567890
// = 1.23456789012345 × 10^19
//
// Тогда log10(value) ≈ log10(1.23456789012345) + 19
function bigIntLog10(value) {
    const str = value.toString();
    const significantDigitsCount = 15;

    // Если число короткое — можно безопасно перевести в Number
    if (str.length <= significantDigitsCount) {
        return Math.log10(Number(str));
    }

    const leadingDigits = Number(str.slice(0, significantDigitsCount));
    const powerOffset = str.length - significantDigitsCount;

    return Math.log10(leadingDigits) + powerOffset;
}



// ------------------------------------------------------
// 7. Красивое сокращение длинных чисел для подсказок
// ------------------------------------------------------
// Было число:
// 1234567890123456789012345
//
// Станет:
// 123456...012345
function shortenValueForTooltip(value) {
    const str = value.toString();

    if (str.length <= 15) {
        return str;
    }

    return `${str.slice(0, 6)}...${str.slice(-6)}`;
}



// ------------------------------------------------------
// 8. Формат подписи обычной оси Y
// ------------------------------------------------------
// Для линейного режима.
// Маленькие числа показываем обычно,
// большие — в научной записи, например 2.3e+12
function formatLinearAxisLabel(value) {
    if (value <= 0) {
        return '';
    }

    if (value < 1e6) {
        return Math.round(value).toLocaleString('en-US');
    }

    const exponent = Math.floor(Math.log10(value));
    const mantissa = (value / Math.pow(10, exponent))
        .toFixed(1)
        .replace(/\.0$/, '');

    return `${mantissa}e+${exponent}`;
}



// ------------------------------------------------------
// 9. Формат подписи логарифмической оси Y
// ------------------------------------------------------
// В лог-режиме на оси уже лежат не реальные значения,
// а log10(реального значения).
//
// Поэтому:
// v = 3  -> это на самом деле 10^3 = 1000
// v = 6  -> это 1 000 000
function formatLogAxisLabel(value) {
    if (value < 0) {
        return '';
    }

    if (value === 0) {
        return '1';
    }

    const actualValue = Math.pow(10, value);

    // Для небольших значений можно показать число нормально
    if (actualValue < 1e4) {
        return Math.round(actualValue).toLocaleString('en-US');
    }

    const roundedExponent = Math.round(value);

    // Если число почти целое — красиво показываем как 10^N
    if (Math.abs(value - roundedExponent) < 0.02) {
        return `10^${roundedExponent}`;
    }

    // Иначе оставляем приближение
    return `10^${value.toFixed(1)}`;
}



// ------------------------------------------------------
// 10. Умный зум для длинных последовательностей
// ------------------------------------------------------
// Идея:
// Если последовательность очень длинная, чаще всего после пика
// она быстро падает вниз и дальше становится "скучной".
// Поэтому для длинных графиков можно автоматически показать
// более полезный участок.
//
// Логика:
// - если лог-режим или длина <= 50, показываем всё
// - находим максимум
// - ищем место, где график после пика упал ниже 1% от максимума
// - показываем до этого места + небольшой хвост
function calculateSmartZoom(sequence, isLogMode) {
    if (isLogMode || sequence.length <= 50) {
        return { start: 0, end: 100 };
    }

    let maxValue = 0n;

    for (const value of sequence) {
        if (value > maxValue) {
            maxValue = value;
        }
    }

    const threshold = maxValue / 100n;
    let peakIndex = sequence.indexOf(maxValue);

    if (peakIndex === -1) {
        peakIndex = 0;
    }

    for (let i = peakIndex; i < sequence.length; i++) {
        if (sequence[i] < threshold) {
            const endPercent = Math.min(
                100,
                Math.round(((i + 30) / sequence.length) * 100)
            );

            return { start: 0, end: endPercent };
        }
    }

    return { start: 0, end: 100 };
}



// ------------------------------------------------------
// 11. Безопасное приближение BigInt -> Number
// ------------------------------------------------------
// Нужно для линейного графика, потому что ECharts рисует Number,
// а не BigInt.
//
// Для коротких чисел переводим напрямую.
// Для огромных — берём первые 15 цифр и умножаем на степень 10.
function bigIntToApproxNumber(value) {
    const str = value.toString();

    if (str.length <= 15) {
        return Number(value);
    }

    const leadingDigits = Number(str.slice(0, 15));
    const exponent = str.length - 15;

    return leadingDigits * Math.pow(10, exponent);
}



// ------------------------------------------------------
// 12. Форматирование больших чисел для карточек статистики
// ------------------------------------------------------
function formatBigIntShort(value) {
    const str = value.toString();

    if (str.length <= 15) {
        return BigInt(value).toLocaleString('en-US');
    }

    return `${str.slice(0, 6)}…${str.slice(-6)}`;
}



// ------------------------------------------------------
// 13. Построение основного графика
// ------------------------------------------------------
// sequence — массив BigInt
// isLogMode — true/false
function renderGraph(sequence, isLogMode) {
    // ------------------------------------------
    // Подготовка данных по оси Y
    // ------------------------------------------
    // В лог-режиме сразу считаем log10 для каждого BigInt.
    // Это важно: ось Y остаётся обычной type:'value',
    // потому что данные УЖЕ преобразованы.
    //
    // В линейном режиме превращаем BigInt в Number-приближение.
    const yData = sequence.map(function (value) {
        if (isLogMode) {
            return bigIntLog10(value);
        }

        return bigIntToApproxNumber(value);
    });

    const zoom = calculateSmartZoom(sequence, isLogMode);

    const LINE_COLOR = '#d81ae8';
    const GLOW_COLOR = '#e24bde';



    // ------------------------------------------
    // Подготовка текста для окна "Data View"
    // ------------------------------------------
    const allStepsText = sequence.map(function (value, index) {
        const operation = value % 2n === 0n ? '÷2' : '×3+1';

        return `${index.toString().padStart(4)} │ ${shortenValueForTooltip(value).padEnd(22)} │ ${operation}`;
    }).join('\n');

    const maxValue = sequence.reduce(function (a, b) {
        return a > b ? a : b;
    }, 0n);

    const statsText = [
        '📊 Collatz Sequence Stats',
        '━━━━━━━━━━━━━━━━━━━━━━',
        `Start : ${shortenValueForTooltip(sequence[0] || 0n)}`,
        `Steps : ${sequence.length}`,
        `Max   : ${shortenValueForTooltip(maxValue)}`,
        `→ 1   : ${sequence[sequence.length - 1] === 1n ? '✅ Yes' : '❌ Not reached'}`,
        '━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');



    // ------------------------------------------
    // Конфигурация ECharts
    // ------------------------------------------
    const option = {
        backgroundColor: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
                { offset: 0, color: '#080510' },
                { offset: 1, color: '#0b080f' }
            ]
        },

        title: {
            text: isLogMode ? 'Log₁₀ Scale' : 'Linear Scale',
            left: 'center',
            top: 10,
            textStyle: {
                color: '#8b5cf6',
                fontSize: 13,
                fontFamily: 'Inter,sans-serif',
                fontWeight: '500'
            }
        },

        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 8, 28, 0.95)',
            borderColor: LINE_COLOR,
            borderWidth: 1.5,
            borderRadius: 10,
            textStyle: {
                color: '#fff',
                fontSize: 12,
                fontFamily: 'Inter,sans-serif'
            },
            padding: [10, 14],
            extraCssText: 'box-shadow: 0 0 20px rgba(216,26,232,0.35);',

            // formatter вызывается ECharts для содержимого tooltip
            formatter: function (params) {
                const index = params[0].dataIndex;
                const value = sequence[index];
                const isEven = value % 2n === 0n;
                const realValue = shortenValueForTooltip(value);

                const logLine = isLogMode
                    ? `<div style="color:#a78bfa;font-size:11px">log₁₀ ≈ ${params[0].value.toFixed(4)}</div>`
                    : '';

                return `
                    <div style="font-weight:600;margin-bottom:4px">Step #${index}</div>
                    <div style="font-family:monospace">${realValue}</div>
                    ${logLine}
                    <div style="color:${isEven ? '#34d399' : '#f87171'};margin-top:2px">
                        ${isEven ? '÷ 2' : '× 3 + 1'}
                    </div>
                `;
            }
        },

        toolbox: {
            right: 18,
            top: 5,
            feature: {
                dataZoom: {
                    yAxisIndex: 'none',
                    title: {
                        zoom: 'Zoom',
                        back: 'Reset'
                    }
                },

                restore: {
                    title: 'Restore'
                },

                saveAsImage: {
                    title: 'Save',
                    name: 'collatz-graph'
                },

                dataView: {
                    show: true,
                    readOnly: true,
                    title: 'Data',
                    lang: [
                        '<span style="font-family:Inter,sans-serif;font-weight:700;font-size:18px">Sequence Data</span>',
                        '<span style="font-family:Inter,sans-serif;font-size:13px">✕ Close</span>',
                        '⟳'
                    ],
                    backgroundColor: '#0d0b14',
                    textColor: '#ddd',
                    buttonColor: LINE_COLOR,
                    buttonTextColor: '#fff',

                    optionToContent: function () {
                        return `
                            <div style="font-family:'Fira Code',monospace;font-size:11px;
                                        background:linear-gradient(180deg,#0d0b14,#130f1e);
                                        padding:16px;border-radius:10px;border:1px solid #2d2040">
                                <pre style="margin:0;color:#a78bfa">${statsText}</pre>
                                <hr style="border-color:#2d2040;margin:10px 0">
                                <pre style="margin:0;max-height:420px;overflow:auto;line-height:1.5;
                                            white-space:pre;color:#ddd">Step │ Value                 │ Op
─────┴───────────────────────┴────
${allStepsText}</pre>
                            </div>
                        `;
                    }
                }
            },
            iconStyle: {
                borderColor: '#555',
                color: 'transparent'
            }
        },

        dataZoom: [
            {
                type: 'inside',
                start: 0,
                end: 100,
                zoomOnMouseWheel: 'shift',
                moveOnMouseMove: true
            },
            {
                type: 'slider',
                start: zoom.start,
                end: zoom.end,
                height: 28,
                bottom: 12,
                backgroundColor: 'rgba(30,20,50,0.4)',
                fillerColor: 'rgba(216,26,232,0.2)',
                borderColor: 'transparent',
                handleStyle: {
                    color: LINE_COLOR,
                    borderColor: GLOW_COLOR,
                    borderRadius: 30,
                    borderWidth: 2,
                    shadowBlur: 8,
                    shadowColor: GLOW_COLOR
                }
            }
        ],

        grid: {
            left: '9%',
            right: '2%',
            top: '13%',
            bottom: '18%'
        },

        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: sequence.map(function (_, index) {
                return index;
            }),
            name: 'Steps',
            nameLocation: 'middle',
            nameGap: 26,
            nameTextStyle: {
                color: '#888',
                fontSize: 11
            },
            axisLine: {
                lineStyle: {
                    color: '#3a3050'
                }
            },
            axisLabel: {
                color: '#888',
                fontSize: 11,
                interval: 'auto',
                hideOverlap: true
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#1e1830',
                    type: 'dashed'
                }
            }
        },

        yAxis: {
            // ВАЖНО:
            // Здесь всегда обычная ось value.
            // Даже в лог-режиме.
            //
            // Потому что если поставить type:'log',
            // ECharts ещё раз применит логарифм,
            // и график станет неверным.
            type: 'value',
            name: isLogMode ? 'log₁₀(Value)' : 'Value',
            nameLocation: 'end',
            nameGap: 12,
            nameTextStyle: {
                color: '#888',
                fontSize: 11
            },
            axisLine: {
                lineStyle: {
                    color: '#3a3050'
                }
            },
            axisLabel: {
                color: '#888',
                fontSize: 11,
                formatter: isLogMode ? formatLogAxisLabel : formatLinearAxisLabel
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#1e1830',
                    type: 'dashed'
                }
            },
            scale: true
        },

        series: [
            {
                name: 'Collatz',
                type: 'line',
                data: yData,
                showSymbol: false,
                symbol: 'circle',
                symbolSize: 4,
                smooth: 0,

                lineStyle: {
                    color: LINE_COLOR,
                    width: 2,
                    shadowColor: GLOW_COLOR,
                    shadowBlur: 10
                },

                itemStyle: {
                    color: LINE_COLOR,
                    borderColor: '#fff',
                    borderWidth: 1.5,
                    shadowColor: GLOW_COLOR,
                    shadowBlur: 8
                },

                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(216,26,232,0.22)' },
                            { offset: 1, color: 'rgba(216,26,232,0.01)' }
                        ]
                    }
                },

                emphasis: {
                    lineStyle: {
                        width: 2.5
                    },
                    itemStyle: {
                        borderWidth: 2.5,
                        shadowBlur: 16
                    }
                },

                markPoint: {
                    data: [
                        {
                            type: 'max',
                            name: 'Peak',
                            label: {
                                formatter: function (point) {
                                    return `★ ${shortenValueForTooltip(sequence[point.dataIndex] ?? 0n)}`;
                                },
                                color: '#fde68a',
                                fontSize: 11
                            },
                            itemStyle: {
                                color: 'rgba(20,10,35,0.85)',
                                borderColor: '#fbbf24',
                                borderWidth: 1.5
                            }
                        }
                    ]
                }
            }
        ]
    };



    // ------------------------------------------
    // Создание графика только один раз
    // ------------------------------------------
    if (!lineChart) {
        lineChart = echarts.init(graphContainer, null, {
            renderer: 'canvas'
        });
    }

    // true = полностью заменить старые настройки новыми
    lineChart.setOption(option, true);
}



// ------------------------------------------------------
// 14. Инициализация круговой диаграммы
// ------------------------------------------------------
// Это диаграмма Even / Odd
function initPieChart() {
    const canvasContext = document
        .getElementById('pieChart')
        .getContext('2d');

    pieChart = new Chart(canvasContext, {
        type: 'doughnut',
        data: {
            labels: ['Even', 'Odd'],
            datasets: [
                {
                    data: [72, 28],
                    backgroundColor: ['#06b6d4', '#5b21b6'],
                    borderWidth: 0,
                    hoverOffset: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}



// ------------------------------------------------------
// 15. Обновление статистики в интерфейсе
// ------------------------------------------------------
function updateInterface(sequence) {
    if (sequence.length === 0) {
        return;
    }



    // ------------------------------------------
    // Базовые величины
    // ------------------------------------------
    const maxValue = sequence.reduce(function (a, b) {
        return a > b ? a : b;
    }, 0n);

    const peakIndex = sequence.indexOf(maxValue);
    const totalSteps = sequence.length - 1;
    const growth = maxValue / sequence[0];



    // ------------------------------------------
    // Максимальные серии роста и падения
    // ------------------------------------------
    let maxUpStreak = 0;
    let maxDownStreak = 0;
    let currentUpStreak = 0;
    let currentDownStreak = 0;

    for (let i = 1; i < sequence.length; i++) {
        const current = sequence[i];
        const previous = sequence[i - 1];

        if (current > previous) {
            currentUpStreak++;
            currentDownStreak = 0;

            if (currentUpStreak > maxUpStreak) {
                maxUpStreak = currentUpStreak;
            }
        } else {
            currentDownStreak++;
            currentUpStreak = 0;

            if (currentDownStreak > maxDownStreak) {
                maxDownStreak = currentDownStreak;
            }
        }
    }



    // ------------------------------------------
    // Среднее значение
    // ------------------------------------------
    const sum = sequence.reduce(function (accumulator, value) {
        return accumulator + value;
    }, 0n);

    const average = sum / BigInt(sequence.length);



    // ------------------------------------------
    // Медиана
    // ------------------------------------------
    const sortedSequence = [...sequence].sort(function (a, b) {
        return a < b ? -1 : 1;
    });

    const middleIndex = Math.floor(sortedSequence.length / 2);

    let median;
    if (sortedSequence.length % 2 !== 0) {
        median = sortedSequence[middleIndex];
    } else {
        median = (sortedSequence[middleIndex - 1] + sortedSequence[middleIndex]) / 2n;
    }



    // ------------------------------------------
    // Подсчёт чётных и нечётных
    // ------------------------------------------
    let evenCount = 0;
    let oddCount = 0;

    sequence.forEach(function (value) {
        if (value % 2n === 0n) {
            evenCount++;
        } else {
            oddCount++;
        }
    });

    const evenPercent = ((evenCount / sequence.length) * 100).toFixed(0);
    const oddPercent = ((oddCount / sequence.length) * 100).toFixed(0);



    // ------------------------------------------
    // Обновляем карточки и статистику
    // ------------------------------------------
    document.getElementById('card-steps').textContent = totalSteps;
    document.getElementById('card-peak').textContent = formatBigIntShort(maxValue);
    document.getElementById('card-growth').textContent = `${growth}x`;

    document.getElementById('stat-start').textContent = formatBigIntShort(sequence[0]);
    document.getElementById('stat-steps').textContent = totalSteps;
    document.getElementById('stat-peak').textContent = formatBigIntShort(maxValue);
    document.getElementById('stat-peak-step').textContent = peakIndex;
    document.getElementById('stat-growth').textContent = `${growth}x`;
    document.getElementById('stat-time-peak').textContent = `${peakIndex} steps`;
    document.getElementById('stat-streak-up').textContent = `${maxUpStreak}↑`;
    document.getElementById('stat-streak-down').textContent = `${maxDownStreak}↓`;
    document.getElementById('stat-avg').textContent = formatBigIntShort(average);
    document.getElementById('stat-median').textContent = formatBigIntShort(median);

    document.getElementById('pct-even').textContent = `${evenPercent}%`;
    document.getElementById('pct-odd').textContent = `${oddPercent}%`;
    document.getElementById('pie-center-text').textContent = `${evenPercent}%`;



    // ------------------------------------------
    // Обновляем круговую диаграмму
    // ------------------------------------------
    if (pieChart) {
        pieChart.data.datasets[0].data = [evenCount, oddCount];
        pieChart.update();
    }
}



// ------------------------------------------------------
// 16. Основной запуск вычисления
// ------------------------------------------------------
function runCollatz() {
    const rawValue = inputEl.value.trim();

    // Если поле пустое — просто возвращаем фокус в input
    if (!rawValue) {
        inputEl.focus();
        return;
    }

    try {
        const startNumber = BigInt(rawValue);

        currentSequence = collatzBigInt(startNumber);

        renderGraph(currentSequence, isLogScaleEnabled);
        updateInterface(currentSequence);
    } catch (error) {
        console.error(error);
        alert('Invalid input. Please enter a positive integer.');
    }
}



// ------------------------------------------------------
// 17. События
// ------------------------------------------------------
runButton.addEventListener('click', runCollatz);

// Enter в input = нажать кнопку Run
inputEl.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        runButton.click();
    }
});

// При изменении размера окна надо подогнать график
window.addEventListener('resize', function () {
    if (lineChart) {
        lineChart.resize();
    }
});



// ------------------------------------------------------
// 18. Динамическая загрузка Chart.js
// ------------------------------------------------------
// После загрузки:
// - создаём круговую диаграмму
// - автоматически запускаем расчёт
const chartScript = document.createElement('script');
chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';

chartScript.onload = function () {
    initPieChart();
    runButton.click();
};

document.head.appendChild(chartScript);