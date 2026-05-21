const inputEl = document.getElementById('input');
const logCheckbox = document.getElementById('log_on');
const runButton = document.getElementById('runBtn');
const chartEl = document.getElementById('chart');

let chart = null;

// Разрешаем вводить только цифры
inputEl.addEventListener('beforeinput', function (event) {
    if (event.data && !/^[0-9]+$/.test(event.data)) {
        event.preventDefault();
    }
});

// Строит последовательность Коллатца через BigInt
function collatzBigInt(startValue) {
    const sequence = [];

    if (startValue === 0n) {
        return sequence;
    }

    let current = startValue;

    while (true) {
        sequence.push(current);

        if (current === 1n) {
            break;
        }

        if (current % 2n === 0n) {
            current = current / 2n;
        } else {
            current = current * 3n + 1n;
        }

        if (sequence.length > 50000) {
            break;
        }
    }

    return sequence;
}

// Считает log10(BigInt), даже если число слишком большое для обычного Number
function bigIntLog10(value) {
    const str = value.toString();
    const digitsToKeep = 15;

    if (str.length <= digitsToKeep) {
        return Math.log10(Number(str));
    }

    const leadingPart = Number(str.slice(0, digitsToKeep));
    return Math.log10(leadingPart) + (str.length - digitsToKeep);
}

// Сокращает длинные числа для tooltip
function shortenValue(value) {
    const str = value.toString();

    if (str.length <= 15) {
        return str;
    }

    return `${str.slice(0, 6)}...${str.slice(-6)}`;
}

// Формат подписи оси Y для обычного режима
function formatLinearAxisLabel(value) {
    if (value <= 0) {
        return '';
    }

    if (value < 1e6) {
        return Math.round(value).toLocaleString('en-US');
    }

    const exponent = Math.floor(Math.log10(value));
    const mantissa = (value / Math.pow(10, exponent))
        .toFixed(2)
        .replace(/\.0+$/, '');

    return `${mantissa}e+${exponent}`;
}

// Формат подписи оси Y для логарифмического режима
// ВАЖНО: value здесь уже является log10(реального числа)
function formatLogAxisLabel(value) {
    if (value < 0) {
        return '';
    }

    if (value === 0) {
        return '1';
    }

    const actualValue = Math.pow(10, value);

    if (actualValue < 1e4) {
        return Math.round(actualValue).toLocaleString('en-US');
    }

    const roundedExponent = Math.round(value);

    // Если значение почти целое, показываем как 10^N
    if (Math.abs(value - roundedExponent) < 0.02) {
        return `10^${roundedExponent}`;
    }

    return `10^${value.toFixed(1)}`;
}

// Автозум для длинных последовательностей
function calculateSmartZoom(sequence, isLogScale) {
    if (isLogScale || sequence.length <= 50) {
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
            const end = Math.min(100, Math.round(((i + 30) / sequence.length) * 100));
            return { start: 0, end };
        }
    }

    return { start: 0, end: 100 };
}

// Приближённо превращает BigInt в Number для линейного графика
function bigIntToApproxNumber(value) {
    const str = value.toString();

    if (str.length <= 15) {
        return Number(value);
    }

    return Number(str.slice(0, 15)) * Math.pow(10, str.length - 15);
}

function renderGraph(sequence, useLogScale) {
    // В лог-режиме сами превращаем значения в log10(...)
    // Поэтому ось Y потом должна быть ОБЫЧНОЙ value, а не log.
    const yData = useLogScale
        ? sequence.map(bigIntLog10)
        : sequence.map(bigIntToApproxNumber);

    const zoom = calculateSmartZoom(sequence, useLogScale);

    const lineColor = '#d81ae8';
    const glowColor = '#e24bde';

    const option = {
        backgroundColor: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
                { offset: 0, color: '#050514' },
                { offset: .50, color: '#150121' },
                { offset: 1, color: '#0e030e' }
            ]
        },

        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(20, 15, 35, 0.95)',
            borderColor: lineColor,
            borderWidth: 2,
            borderRadius: 8,
            textStyle: {
                color: '#fff',
                fontSize: 12
            },
            padding: [10, 14],
            extraCssText: 'box-shadow: 0 0 20px rgba(216, 26, 232, 0.4);',
            formatter: function (params) {
                const index = params[0].dataIndex;
                const value = sequence[index];
                const isEven = value % 2n === 0n;

                const extraLogLine = useLogScale
                    ? `<div style="color:#c4b5fd">log₁₀ ≈ ${params[0].value.toFixed(4)}</div>`
                    : '';

                return `
                    <div style="font-weight:bold;margin-bottom:4px">Step #${index}</div>
                    <div>Value: ${shortenValue(value)}</div>
                    ${extraLogLine}
                    <div style="color:${isEven ? '#4ade80' : '#f87171'}">
                        ${isEven ? '÷ 2' : '× 3 + 1'}
                    </div>
                `.trim();
            }
        },

        toolbox: {
            right: 20,
            top: 5,
            feature: {
                dataZoom: {
                    yAxisIndex: 'none',
                    title: {
                        zoom: 'Zoom In',
                        back: 'Zoom Back'
                    }
                },
                restore: {
                    title: 'Restore'
                },
                saveAsImage: {
                    title: 'Save',
                    name: 'collatz-graph'
                }
            },
            iconStyle: {
                borderColor: '#888',
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
                height: 30,
                bottom: 15,
                backgroundColor: 'rgba(58, 70, 50, 0.3)',
                fillerColor: 'rgba(216, 26, 232, 0.25)',
                borderColor: '#d81ae8',
                handleStyle: {
                    color: lineColor,
                    borderColor: glowColor,
                    borderRadius: 30,
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: glowColor
                }
            }
        ],

        grid: {
            left: '1%',
            right: '3%',
            top: '15%',
            bottom: '20%',
            containLabel: true,
            borderColor: '#343d3a',
            borderWidth: 1
        },

        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: sequence.map(function (_, index) {
                return index;
            }),
            name: '',
            nameLocation: 'end',
            nameGap: 30,
            nameTextStyle: {
                color: '#aaa',
                align: 'center'
            },
            axisLine: {
                lineStyle: {
                    color: '#555',
                    width: 1
                }
            },
            axisLabel: {
                color: '#aaa',
                margin: 5,
                interval: 'auto',
                hideOverlap: true,
                rotate: 0
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#2a2a3a',
                    type: 'dashed',
                    width: 0.5
                }
            }
        },

        yAxis: {
            // ВСЕГДА value.
            // В лог-режиме данные уже заранее превращены в log10.
            type: 'value',
            name: useLogScale ? 'log₁₀(Value)' : 'Value',
            nameLocation: 'end',
            nameGap: 15,
            nameTextStyle: {
                color: '#aaa',
                rotate: 0
            },
            axisLine: {
                lineStyle: {
                    color: '#555',
                    width: 1
                }
            },
            axisLabel: {
                color: '#aaa',
                formatter: function (value) {
                    return useLogScale
                        ? formatLogAxisLabel(value)
                        : formatLinearAxisLabel(value);
                }
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#2a2a3a',
                    width: 0.5
                }
            },
            scale: true
        },

        series: [
            {
                name: 'Collatz Sequence',
                type: 'line',
                data: yData,
                symbolSize: 3,
                showSymbol: false,
                smooth: 0.05,
                lineStyle: {
                    color: lineColor,
                    width: 2,
                    type: 'solid',
                    shadowColor: glowColor,
                    shadowBlur: 10
                },
                itemStyle: {
                    color: lineColor,
                    borderColor: '#ececec',
                    borderWidth: 1.6,
                    borderRadius: 20,
                    shadowColor: glowColor,
                    shadowBlur: 10
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(216, 26, 232, 0.25)' },
                            { offset: 1, color: 'rgba(216, 26, 232, 0.02)' }
                        ]
                    }
                },
                emphasis: {
                    lineStyle: {
                        width: 2,
                        shadowBlur: 8
                    },
                    itemStyle: {
                        borderWidth: 3,
                        shadowBlur: 15
                    }
                }
            }
        ]
    };

    if (!chart) {
        chart = echarts.init(chartEl, null, { renderer: 'canvas' });
    }

    chart.setOption(option, true);
}

function runCollatz() {
    const rawValue = inputEl.value.trim();

    if (!rawValue) {
        inputEl.focus();
        return;
    }

    try {
        const startValue = BigInt(rawValue);
        const sequence = collatzBigInt(startValue);
        const useLogScale = logCheckbox.checked;

        renderGraph(sequence, useLogScale);
    } catch (error) {
        console.error(error);
        alert('Invalid input. Please enter a positive integer.');
    }
}

runButton.addEventListener('click', runCollatz);

inputEl.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        runCollatz();
    }
});

window.addEventListener('resize', function () {
    if (chart) {
        chart.resize();
    }
});

// Автозапуск
if (!inputEl.value) {
    inputEl.value = '27';
}
runCollatz();