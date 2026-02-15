const inp = document.getElementById('input');
const runBtn = document.querySelector('.play');
const chartEl = document.getElementById('chart');

chartEl.style.width = '500px';
chartEl.style.height = '300px';

/* ===== input filter  (NUMBERS ONLY (so you can input infinite amount of nums)) ===== */
inp.addEventListener('beforeinput', e => {
    if (e.data && !/^[0-9]+$/.test(e.data)) {
        e.preventDefault();
    }
});

/* ===== Collatz calculations BigInt ONLY ===== */
function collatzBigInt(n) {
    const spisok = [];

    if (n === 0n) return spisok;

    while (true) {
        spisok.push(n);
        if (n === 1n) break;

        if (n % 2n === 0n) {
            n = n / 2n;
        } else {
            n = n * 3n + 1n;
        }

        if (spisok.length > 20000) break;
    }

    return spisok;
};

/* ===== graph compiler (BigInt -> Number) ===== */
function graphLogSize(value) {
    const s = value.toString();
    const k = 15;

    if (s.length <= k) {
        return Math.log10(Number(s));
    }

    const lead = Number(s.slice(0, k));
    return Math.log10(lead) + (s.length - k);
}

/* ===== make nums short (for tooltip) ===== */
function toolTipShorten(value) {
    const s = value.toString();
    if (s.length <= 15) return s;
    return s.slice(0, 6) + '...' + s.slice(-6);
} // now its like 12345678901234567890 (big number) -> 123456...567890

/* ===== y-axis formatter (almost like function above this but for Yaxis) ===== */
function formatOriginalForAxis(value, sig = 2) {
    const s = value.toString();
    if (s.length <= sig) return s;

    const exp = s.length - 1;
    const lead = Number(s.slice(0, sig));
    const mant = (lead / Math.pow(10, sig - 1)).toFixed(2).replace(/\.0+$/, '');
    return `${mant}e+${exp}`;
}

/* ===== ECharts ===== */
const chart = echarts.init(chartEl, 'dark');

function renderGraph(spisok) {
    const nums = spisok.map(graphLogSize);

    const option = {
        title: { text: 'Linear chart' },

        // tooltip (for chosen dot's info)
        tooltip: {
            trigger: 'axis',
            formatter(params) {
                const i = params[0].dataIndex;
                const v = spisok[i];
                const even = v % 2n === 0n;
                return `
                    Step: ${i}<br>
                    Value: ${toolTipShorten(v)}<br>
                    Operation: ${even ? '/ 2' : '* 3 + 1'}
                `;
            }
        },


        // zoom, save and all that stuff
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
                restore: {},
                saveAsImage: {}
            }
        },

        dataZoom: [
            {
                type: 'inside',
                start: 0,
                end: 100
            },
            {
                start: 0,
                end: 10
            }
        ],


        // horizontal axis
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: spisok.map((_, i) => i)
        },

        // vertical axis 
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter(v) {
                    const real = Math.pow(10, v);

                    // small nums - normal
                    if (real < 1000) {
                        return Math.round(real).toString();
                    }

                    // medium size nums - shorten
                    if (real < 1e6) {
                        return real.toFixed(0);
                    }

                    // big nums - smth like 1e324
                    const exp = Math.floor(v);
                    const mant = Math.pow(10, v - exp).toFixed(2).replace(/\.0+$/, '');
                    return `${mant}e+${exp}`;
                }
            }
        },

        // doesnt matter i guess
        series: [{
            type: 'line',
            data: nums,
            showSymbol: true,
            symbolSize: 6
        }]
    };

    chart.setOption(option, true);
}


/* ===== run ===== */
runBtn.addEventListener('click', () => {
    if (!inp.value) return;

    const n = BigInt(inp.value);
    const spisok = collatzBigInt(n);

    renderGraph(spisok);
});