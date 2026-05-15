// main.js — переписанная версия (совместимая с вашим UI)
// Я оставил комментарии и уникальные локальные имена для внутренних вспомогательных функций,
// чтобы не конфликтовать с глобальными функциями в вашем проекте.

document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM ----
    const inp = document.querySelector('.input');
    const counter = document.querySelector('.steps-count');
    const steps = document.querySelector('.steps');
    const btn = document.querySelector('.btn');
    const maxstat = document.querySelector('.max-stat');
    const copyBtn = document.querySelector('.copy');
    const currentNum = document.querySelector('.currentNumDig');

    const speedRange = document.getElementById('speed');
    const valueLabel = document.getElementById('speedValue');

    // ---- state ----
    let currentSpeed = speedRange ? Number(speedRange.value) : 1;
    let stepSpeed = 750;
    let isRunning = false;
    let currentTimeout = null;

    // global app object (keeps compatibility)
    window.CollatzApp = window.CollatzApp || {};
    window.CollatzApp.lastList = [];
    window.CollatzApp.onNewList = window.CollatzApp.onNewList || null;

    // ---- input guard ----
    if (inp) {
        inp.addEventListener('beforeinput', e => {
            if (e.data && !/^[0-9]+$/.test(e.data)) e.preventDefault();
        });
    }

    // ---- utils (global helpers retained) ----
    function shortenNumForCND(value, mode = 'auto') {
        const str = (typeof value === 'bigint') ? value.toString() : String(value);
        if (str.length <= 12) return str;
        if (mode === 'dots') return str.slice(0, 6) + '...' + str.slice(-4);
        if (mode === 'e') {
            const first = str[0];
            const after = str.slice(1);
            const exp = after.length;
            return `${first}.${after.slice(0, 3)}e+${exp}`;
        }
        if (mode === 'auto' && str.length <= 15) {
            const first = str[0];
            const after = str.slice(1);
            const exp = after.length;
            return `${first}.${after.slice(0, 3)}e+${exp}`;
        }
        return str;
    }

    function changeForASec(item, changetxt, time) {
        if (!item) return;
        const old = item.textContent;
        item.textContent = changetxt;
        setTimeout(() => { item.innerHTML = old; }, time);
    }

    // ---- speed slider ----
    function speedRangeGetValue() {
        if (!speedRange) return;
        speedRange.addEventListener('input', () => {
            currentSpeed = Number(speedRange.value);
            valueLabel && (valueLabel.innerHTML = currentSpeed + 'x');
            if (currentSpeed === 1) stepSpeed = 750;
            else if (currentSpeed === 2) stepSpeed = 150;
            else if (currentSpeed === 3) stepSpeed = 50;
            else if (currentSpeed === 4) stepSpeed = 10;
            else if (currentSpeed === 5) stepSpeed = false; // no delay
        });
    }
    speedRangeGetValue();

    // ---- parser ----
    function IntOrBigInt(inputValue) {
        if (typeof inputValue !== 'string') inputValue = String(inputValue);
        const s = inputValue.trim();
        if (!/^[0-9]+$/.test(s)) return { error: "Введите положительное число." };
        const normalized = s.split('.')[0];
        // threshold: more than 2 digits previously, but safer: > 15 digits treat as BigInt
        if (normalized.length > 15) {
            try {
                return { value: BigInt(s), isBig: true };
            } catch (err) {
                return { error: "Число слишком большое." };
            }
        }
        return { value: Number(s), isBig: false };
    }

    // ---- collatz generator ----
    function collatzSmart(n, isBig) {
        const spisok = [n];
        const ONE = isBig ? 1n : 1;
        const TWO = isBig ? 2n : 2;
        const THREE = isBig ? 3n : 3;
        while (n !== ONE) {
            if (n % TWO === (isBig ? 0n : 0)) {
                n = n / TWO;
            } else {
                n = n * THREE + ONE;
            }
            spisok.push(n);
            if (spisok.length > 16000) {
                spisok.push('Отличное число, но шаги вызывают приступ у сайта!');
                break;
            }
        }
        if (n === ONE) spisok.push("Цикл достигнут.");
        return spisok;
    }

    // ---- copy button ----
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const parsed = IntOrBigInt(inp.value || '');
            if (parsed.error) { changeForASec(copyBtn, parsed.error, 800); return; }
            const spisok = collatzSmart(parsed.value, parsed.isBig);
            const numsOnly = spisok.filter(x => typeof x === 'number' || typeof x === 'bigint');
            const textToCopy = numsOnly.join('\n');
            navigator.clipboard.writeText(textToCopy)
                .then(() => changeForASec(copyBtn, 'Скопировано!', 500))
                .catch(err => changeForASec(copyBtn, `Error: ${err}`, 800));
        });
    }

    // ---- playSteps ----
    function maxOfList(list) {
        let max = null;
        for (const v of list) {
            if (typeof v === 'number' || typeof v === 'bigint') {
                if (max === null || v > max) max = v;
            }
        }
        return max;
    }

    function playSteps(list, i = 0) {
        if (i >= list.length) { isRunning = false; return; }
        const value = list[i];
        const p = document.createElement('p');
        p.textContent = (typeof value === 'number' || typeof value === 'bigint') ? `${i + 1}. ${value}` : value;
        steps.appendChild(p);
        steps.scrollTo({ top: steps.scrollHeight });

        const shown = list.slice(0, i + 1);
        const stepsCount = shown.filter(x => typeof x === 'number' || typeof x === 'bigint').length;
        counter && (counter.textContent = `количество шагов: ${stepsCount}`);

        const max = maxOfList(shown);
        maxstat && (maxstat.textContent = `самое большое число: ${max === null ? '-' : String(max)}`);

        currentNum && (currentNum.textContent = (typeof value === 'number' || typeof value === 'bigint') ? shortenNumForCND(value, 'e') : '1');

        // update graph (delay small to avoid blocking UI)
        setTimeout(() => updateGraph_shim(shown), 50);

        if (isRunning && stepSpeed !== false) {
            currentTimeout = setTimeout(() => playSteps(list, i + 1), stepSpeed);
        } else if (isRunning && stepSpeed === false) {
            // no delay -> next tick via requestAnimationFrame to keep UI responsive
            requestAnimationFrame(() => playSteps(list, i + 1));
        }
    }

    // ---- main button ----
    if (btn) {
        btn.addEventListener('click', () => {
            steps.textContent = '';
            const parsed = IntOrBigInt(inp.value || '');
            if (parsed.error) { steps.textContent = parsed.error; return; }
            const spisok = collatzSmart(parsed.value, parsed.isBig);
            window.CollatzApp.lastList = spisok;
            if (typeof window.CollatzApp.onNewList === 'function') window.CollatzApp.onNewList(spisok);
            if (isRunning && currentTimeout) { clearTimeout(currentTimeout); isRunning = false; }
            isRunning = true;
            playSteps(spisok);
        });
    }

    // ---- helper: tooltip shortening ----
    function toolTipShortenLocal(v) {
        const s = v.toString();
        if (s.length <= 15) return s;
        return s.slice(0, 6) + '...' + s.slice(-6);
    }

    // ---- helper: approx log of BigInt ----
    function approxLog10BigIntLocal(big) {
        const s = big.toString();
        const k = 15;
        const lead = Number(s.slice(0, k));
        const len = s.length;
        return Math.log10(lead) + (len - k);
    }

    // ---- GRAPH: unique-name updateGraph ----
    // This function is intentionally local-named to avoid conflicts.
    let graphInstance = null;
    function updateGraph_shim(list) {
        // Local helper names inside to avoid collision with global functions
        function __cg_to_linear(v) {
            if (typeof v === 'number') return v;
            // BigInt -> Number if safe, otherwise approximate by leading digits * 10^(len-lead)
            try {
                const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
                if (v <= maxSafe) return Number(v);
            } catch (e) { /* ignore */ }
            // too big -> return Infinity sentinel (we won't feed Infinity to series in linear mode)
            return Infinity;
        }
        function __cg_to_log(v) {
            if (typeof v === 'number') return Math.log10(Math.max(1, v));
            return approxLog10BigIntLocal(v);
        }
        function __cg_fmt_linear_label(val) {
            if (!isFinite(val)) return '';
            if (Math.abs(val) < 1e6) return String(Math.round(val));
            return Number(val).toExponential(2);
        }
        function __cg_fmt_log_label(val) {
            // val is log10(original)
            const approx = Math.pow(10, val);
            if (!isFinite(approx)) return val.toExponential(2);
            if (approx < 1e6) return String(Math.round(approx));
            return approx.toExponential(2);
        }
        function __cg_tooltip_formatter(params) {
            const p = params[0];
            const idx = p.dataIndex;
            const orig = spis[idx];
            const step = idx + 1;
            const origStr = (typeof orig === 'bigint') ? orig.toString() : String(orig);
            const isEven = (typeof orig === 'bigint') ? (orig % 2n === 0n) : (orig % 2 === 0);
            const op = isEven ? '/ 2' : '* 3 + 1';
            return `Step: ${step}<br>Value: ${toolTipShortenLocal(origStr)}<br>Operation: ${op}`;
        }

        const spis = list.filter(x => typeof x === 'number' || typeof x === 'bigint');
        if (!spis.length) return;

        // Determine whether to use linear or log visualization.
        // Heuristic: if first value is huge (BigInt length > 12) OR numeric > 1e9 -> use log display.
        const first = spis[0];
        const forceLog = (typeof first === 'bigint' && first.toString().length > 12) || (typeof first === 'number' && first > 1e9);

        // Build series data depending on mode
        const series_linear = [];
        const series_log = [];
        for (const v of spis) {
            const lin = __cg_to_linear(v);
            series_linear.push(lin === Infinity ? null : lin); // null will be ignored by graph
            series_log.push(__cg_to_log(v));
        }

        const useLog = forceLog; // currently automatic; could be toggled by UI later
        const seriesData = useLog ? series_log : series_linear;

        if (!graphInstance) {
            const el = document.getElementById('sim-graph');
            if (!el) return;
            graphInstance = echarts.init(el, 'dark');
            graphInstance.showLoading();
        }

        const option = {
            title: { text: useLog ? 'Log chart' : 'Linear chart' },
            tooltip: { trigger: 'axis', formatter: __cg_tooltip_formatter },
            toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, saveAsImage: {} } },
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { start: 0, end: 10 }],
            xAxis: { type: 'category', name: 'Step', boundaryGap: false, data: spis.map((_, i) => i) },
            yAxis: {
                type: 'value',
                name: useLog ? 'log10(Value)' : 'Value',
                axisLabel: { formatter: useLog ? __cg_fmt_log_label : __cg_fmt_linear_label }
            },
            series: [{
                type: 'line',
                data: seriesData,
                showSymbol: true,
                symbol: 'circle',
                symbolSize: 6,
                smooth: false,
                large: true
            }]
        };

        graphInstance.setOption(option, true);
        graphInstance.hideLoading();
    }

    // Expose updateGraph globally (preserve API)
    window.updateGraph = function(list) { updateGraph_shim(list); };

    // Keep onNewList behavior (optional)
    window.CollatzApp.onNewList = function(list) {
        // preserve original behavior; we don't call drawGraph here by default
        // but we update lastList and can trigger graph update if needed
        window.CollatzApp.lastList = list;
    };

}); // DOMContentLoaded

// ----------------------------
// Additional global helpers (kept for backward compatibility)
// ----------------------------
function shorten(numStr) {
    if (typeof numStr !== 'string') numStr = String(numStr);
    if (numStr.length <= 12) return numStr;
    return numStr.slice(0, 6) + "..." + numStr.slice(-4);
}

function normalize(value) {
    if (typeof value === 'number') return value;
    try {
        if (value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
    } catch (e) {}
    return Math.log10(String(value).length);
}

function toolTipShorten(value) {
    const s = String(value);
    if (s.length <= 15) return s;
    return s.slice(0, 6) + "..." + s.slice(-6);
}

function graphLogSize(value) {
    if (typeof value === 'number') {
        if (!isFinite(value)) return NaN;
        return Math.log10(Math.max(1, value));
    }
    // approximate for BigInt
    const s = value.toString();
    const k = 15;
    const leadStr = s.slice(0, k);
    const leadNum = Number(leadStr);
    const len = s.length;
    return Math.log10(leadNum) + (len - k);
}

function yAxisValueShorten(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '';
    let exp = Math.floor(value);
    const frac = value - exp;
    if (exp >= -3 && exp <= 6) {
        const real = Math.round(Math.pow(10, value));
        return String(real);
    }
    let mantissa = Math.pow(10, frac);
    let mantissaRounded = Number(mantissa.toFixed(2));
    if (mantissaRounded >= 10) {
        mantissaRounded = Number((mantissaRounded / 10).toFixed(2));
        exp += 1;
    }
    let mantissaStr = mantissaRounded % 1 === 0 ? String(mantissaRounded) : String(mantissaRounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
    const sign = exp >= 0 ? '+' : '';
    return `${mantissaStr}e${sign}${exp}`;
}

function formatOriginalForAxis(value, sigDigits = 2) {
    if (value === undefined) return '';
    if (typeof value === 'number') {
        if (!isFinite(value)) return '';
        if (Math.abs(value) <= 1e6) return String(Math.round(value));
        const parts = value.toExponential(sigDigits - 1).split('e');
        const mant = parts[0].replace(/\.0+$/, '');
        const exp = Number(parts[1]);
        const sign = exp >= 0 ? '+' : '';
        return `${mant}e${sign}${exp}`;
    }
    const s = value.toString();
    if (s.length <= 3) return s;
    const exp = s.length - 1;
    const lead = s.slice(0, sigDigits);
    let mantissa = Number(lead) / Math.pow(10, sigDigits - 1);
    let mantRounded = Number(mantissa.toFixed(2));
    if (mantRounded >= 10) mantRounded = Number((mantRounded / 10).toFixed(2));
    const mantStr = mantRounded % 1 === 0 ? String(mantRounded) : String(mantRounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
    const sign = exp >= 0 ? '+' : '';
    return `${mantStr}e${sign}${exp}`;
}
