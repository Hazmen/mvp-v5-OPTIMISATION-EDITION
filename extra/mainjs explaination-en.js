// main.js — rewritten version (compatible with your UI)
// I left comments and unique local names for internal helper functions,
// to avoid conflicts with global functions in your project.

// Wait for the HTML document to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM ----
    // Find elements on the page by their classes or IDs
    const inp = document.querySelector('.input');        // Input field for the number
    const counter = document.querySelector('.steps-count'); // Element to display the number of steps
    const steps = document.querySelector('.steps');       // Container for outputting sequence steps
    const btn = document.querySelector('.btn');           // Button to start calculations
    const maxstat = document.querySelector('.max-stat');  // Element to display the maximum number
    const copyBtn = document.querySelector('.copy');      // Button to copy the sequence
    const currentNum = document.querySelector('.currentNumDig'); // Element to display the current number

    // Elements related to animation speed
    const speedRange = document.getElementById('speed');      // Speed slider
    const valueLabel = document.getElementById('speedValue'); // Element showing the current speed

    // ---- state ----
    // Application state variables
    let currentSpeed = speedRange ? Number(speedRange.value) : 1; // Current selected speed (default 1)
    let stepSpeed = 750;      // Delay between steps in milliseconds (initially 750 ms)
    let isRunning = false;    // Flag indicating whether the calculation process is running
    let currentTimeout = null; // ID of the current setTimeout, so it can be cancelled

    // ---- global app object (keeps compatibility) ----
    // Global object for compatibility with other parts of the application
    // If the object already exists, use it; otherwise, create a new one
    window.CollatzApp = window.CollatzApp || {};
    window.CollatzApp.lastList = []; // Stores the last computed sequence
    // Function called when a new sequence is generated (default null)
    window.CollatzApp.onNewList = window.CollatzApp.onNewList || null;

    // ---- input guard ----
    // Input check for the inp field: only allow digits to be entered
    if (inp) { // Check if the inp element exists
        inp.addEventListener('beforeinput', e => { // Listener for the event before a character is input
            // If the input character exists and is not a digit (0-9)
            if (e.data && !/^[0-9]+$/.test(e.data)) {
                e.preventDefault(); // Cancel the character input
            }
        });
    }

    // ---- utils (global helpers retained) ----
    // Helper function to shorten long numbers for display
    function shortenNumForCND(value, mode = 'auto') {
        // Convert the value to a string: use .toString() for BigInt, String() for number
        const str = (typeof value === 'bigint') ? value.toString() : String(value);
        // If the string is shorter than or equal to 12 characters, return as is
        if (str.length <= 12) return str;
        // If mode is 'dots', return the string in the format "123456...7890"
        if (mode === 'dots') return str.slice(0, 6) + '...' + str.slice(-4);
        // If mode is 'e', return exponential notation
        if (mode === 'e') {
            const first = str[0];       // First digit
            const after = str.slice(1); // Remaining part of the string
            const exp = after.length;   // Length of the remaining part = exponent
            return `${first}.${after.slice(0, 3)}e+${exp}`;
        }
        // If mode is 'auto' and the string is shorter than or equal to 15 characters
        if (mode === 'auto' && str.length <= 15) {
            const first = str[0];       // First digit
            const after = str.slice(1); // Remaining part
            const exp = after.length;   // Exponent
            return `${first}.${after.slice(0, 3)}e+${exp}`;
        }
        // If none of the conditions match, return the string as is
        return str;
    }

    // Helper function: temporarily changes the text of an element for a given time
    function changeForASec(item, changetxt, time) {
        if (!item) return; // If the element doesn't exist, exit
        const old = item.textContent; // Save the old text
        item.textContent = changetxt; // Change the text to the new one
        // After the specified time (time), revert to the old text
        setTimeout(() => { item.innerHTML = old; }, time);
    }

    // ---- speed slider ----
    // Function to set up a listener for the speed slider
    function speedRangeGetValue() {
        if (!speedRange) return; // If the slider is not found, exit
        speedRange.addEventListener('input', () => { // When the slider value changes
            currentSpeed = Number(speedRange.value); // Convert the value to a number
            // Update the speed display if the valueLabel element exists
            valueLabel && (valueLabel.innerHTML = currentSpeed + 'x');
            // Depending on the selected speed, set the delay between steps
            if (currentSpeed === 1) stepSpeed = 750;    // 1x — 750 ms
            else if (currentSpeed === 2) stepSpeed = 150; // 2x — 150 ms
            else if (currentSpeed === 3) stepSpeed = 50;  // 3x — 50 ms
            else if (currentSpeed === 4) stepSpeed = 10;  // 4x — 10 ms
            else if (currentSpeed === 5) stepSpeed = false; // 5x — no delay (very fast)
        });
    }
    speedRangeGetValue(); // Call the function immediately after its definition

    // ---- parser ----
    // Function to check and convert a string to a number (Number or BigInt)
    function IntOrBigInt(inputValue) {
        // If the input value is not a string, convert it to a string
        if (typeof inputValue !== 'string') inputValue = String(inputValue);
        // Remove leading/trailing spaces from the string
        const s = inputValue.trim();
        // Check if the string consists only of digits
        if (!/^[0-9]+$/.test(s)) return { error: "Введите положительное число." };
        // Remove fractional part (if any)
        const normalized = s.split('.')[0];
        // If the string length is greater than 15 characters, use BigInt (for very large numbers)
        if (normalized.length > 15) {
            try {
                // Try to create a BigInt from the string
                return { value: BigInt(s), isBig: true };
            } catch (err) {
                // If it fails (e.g., syntax error), return an error
                return { error: "Число слишком большое." };
            }
        }
        // Otherwise use Number
        return { value: Number(s), isBig: false };
    }

    // ---- collatz generator ----
    // Function to compute the Collatz sequence for a given number
    function collatzSmart(n, isBig) {
        // Create a list starting with the initial number
        const spisok = [n];
        // Define constants depending on the type (number or bigint)
        const ONE = isBig ? 1n : 1;
        const TWO = isBig ? 2n : 2;
        const THREE = isBig ? 3n : 3;
        // While n is not equal to 1
        while (n !== ONE) {
            // If n is even
            if (n % TWO === (isBig ? 0n : 0)) {
                n = n / TWO;        // Divide by 2
            } else {
                n = n * THREE + ONE // Otherwise: multiply by 3 and add 1
            }
            // Add the new value to the list
            spisok.push(n);
            // If the list becomes too long — stop
            if (spisok.length > 16000) {
                spisok.push('Отличное число, но шаги вызывают приступ у сайта!');
                break;
            }
        }
        // If n becomes 1, add a message about completion
        if (n === ONE) spisok.push("Цикл достигнут.");
        // Return the list of steps
        return spisok;
    }

    // ---- copy button ----
    // Click handler for the copy button
    if (copyBtn) { // Check if the button exists
        copyBtn.addEventListener('click', () => {
            // Parse the input value from the inp field (or empty string if inp is empty)
            const parsed = IntOrBigInt(inp.value || '');
            // If there was an error during parsing
            if (parsed.error) {
                // Show the error on the button for 800 ms
                changeForASec(copyBtn, parsed.error, 800);
                return; // Exit
            }
            // Compute the Collatz sequence
            const spisok = collatzSmart(parsed.value, parsed.isBig);
            // Filter only numbers (remove strings like "cycle reached")
            const numsOnly = spisok.filter(x => typeof x === 'number' || typeof x === 'bigint');
            // Join the numbers into a string with line breaks
            const textToCopy = numsOnly.join('\n');
            // Copy the text to the clipboard
            navigator.clipboard.writeText(textToCopy)
                // If the copy was successful
                .then(() => changeForASec(copyBtn, 'Скопировано!', 500)) // Show "Copied!" for 500 ms
                // If an error occurred
                .catch(err => changeForASec(copyBtn, `Error: ${err}`, 800)); // Show the error for 800 ms
        });
    }

    // ---- playSteps ----
    // Helper function: finds the maximum number in a list
    function maxOfList(list) {
        let max = null; // Initial max value — null
        // Iterate over each element in the list
        for (const v of list) {
            // Check if the element is a number or BigInt
            if (typeof v === 'number' || typeof v === 'bigint') {
                // If max is not set yet or the current element is greater than max
                if (max === null || v > max) {
                    max = v; // Update max
                }
            }
        }
        return max; // Return the maximum number found
    }

    // Function animates the sequence steps
    function playSteps(list, i = 0) {
        // If we've reached the end of the list, stop execution
        if (i >= list.length) {
            isRunning = false;  // Reset the running flag
            return;
        }
        // Get the current element from the list
        const value = list[i];
        // Create a new <p> element to display the step
        const p = document.createElement('p');
        // If the element is a number, add the step number
        p.textContent = (typeof value === 'number' || typeof value === 'bigint') ? `${i + 1}. ${value}` : value;
        // Append the element to the steps container
        steps.appendChild(p);
        // Scroll the steps container to the bottom to show the latest element
        steps.scrollTo({ top: steps.scrollHeight });

        // Get the sublist from the start up to the current step (inclusive)
        const shown = list.slice(0, i + 1);
        // Count the number of steps (only numeric elements)
        const stepsCount = shown.filter(x => typeof x === 'number' || typeof x === 'bigint').length;
        // Update the step counter on the page (if the element exists)
        counter && (counter.textContent = `количество шагов: ${stepsCount}`);

        // Find the maximum number among the shown ones
        const max = maxOfList(shown);
        // Update the display of the maximum number (if the element exists)
        maxstat && (maxstat.textContent = `самое большое число: ${max === null ? '-' : String(max)}`);

        // Update the current number on the indicator (if the element exists)
        currentNum && (currentNum.textContent = (typeof value === 'number' || typeof value === 'bigint') ? shortenNumForCND(value, 'e') : '1');

        // Update the graph with a small delay (50 ms) to avoid blocking the UI
        setTimeout(() => updateGraph_shim(shown), 50);

        // If the process is running and the step delay is not disabled
        if (isRunning && stepSpeed !== false) {
            // Set a timer for the next step
            currentTimeout = setTimeout(() => playSteps(list, i + 1), stepSpeed);
        } else if (isRunning && stepSpeed === false) { // If the delay is disabled
            // Use requestAnimationFrame for the next step to keep the UI responsive
            requestAnimationFrame(() => playSteps(list, i + 1));
        }
    }

    // ---- main button ----
    // Click handler for the main button
    if (btn) { // Check if the button exists
        btn.addEventListener('click', () => {
            steps.textContent = ''; // Clear the steps container
            // Parse the input value from the inp field (or empty string if inp is empty)
            const parsed = IntOrBigInt(inp.value || '');
            // If there was an error during parsing
            if (parsed.error) {
                steps.textContent = parsed.error; // Display the error in the steps container
                return; // Exit
            }
            // Compute the sequence
            const spisok = collatzSmart(parsed.value, parsed.isBig);
            // Save the sequence to the global object
            window.CollatzApp.lastList = spisok;
            // If the onNewList function is defined, call it
            if (typeof window.CollatzApp.onNewList === 'function') window.CollatzApp.onNewList(spisok);
            // If the process is already running, stop it
            if (isRunning && currentTimeout) {
                clearTimeout(currentTimeout); // Clear the current timer
                isRunning = false;            // Reset the flag
            }
            isRunning = true; // Set the running flag
            playSteps(spisok); // Start the step animation
        });
    }

    // ---- helper: tooltip shortening ----
    // Helper function to shorten numbers in graph tooltips
    function toolTipShortenLocal(v) {
        const s = v.toString(); // Convert the value to a string
        // If the string is shorter than or equal to 15 characters, return as is
        if (s.length <= 15) return s;
        // Otherwise return the first 6 and last 6 characters with "..."
        return s.slice(0, 6) + '...' + s.slice(-6);
    }

    // ---- helper: approx log of BigInt ----
    // Helper function for approximate logarithm calculation of BigInt
    function approxLog10BigIntLocal(big) {
        const s = big.toString(); // Convert BigInt to string
        const k = 15;             // Constant for determining the initial part of the number
        const lead = Number(s.slice(0, k)); // First 15 digits as a number
        const len = s.length;               // Total length of the string
        // Approximate logarithm = log10(first 15 digits) + (remaining length)
        return Math.log10(lead) + (len - k);
    }

    // ---- GRAPH: unique-name updateGraph ----
    // This function is intentionally locally named to avoid conflicts.
    let graphInstance = null; // Variable to store the graph instance
    function updateGraph_shim(list) {
        // Local helper functions inside to avoid conflict with global functions
        // Converts value to linear format (for Y-axis in linear mode)
        function __cg_to_linear(v) {
            if (typeof v === 'number') return v; // If it's a regular number, return as is
            // BigInt -> Number if safe, otherwise approximate via leading digits * 10^(len-lead)
            try {
                const maxSafe = BigInt(Number.MAX_SAFE_INTEGER); // Maximum safe number for Number
                if (v <= maxSafe) return Number(v); // If BigInt fits into Number, convert
            } catch (e) { /* ignore errors */ }
            // If too large -> return Infinity (we won't use Infinity in the data)
            return Infinity;
        }
        // Converts value to logarithmic format (for Y-axis in logarithmic mode)
        function __cg_to_log(v) {
            if (typeof v === 'number') return Math.log10(Math.max(1, v)); // Log of a regular number
            return approxLog10BigIntLocal(v); // Approximate log of BigInt
        }
        // Formats numbers for display on the Y-axis in linear mode
        function __cg_fmt_linear_label(val) {
            if (!isFinite(val)) return ''; // If not finite, return an empty string
            if (Math.abs(val) < 1e6) return String(Math.round(val)); // If less than 1 million — round
            return Number(val).toExponential(2); // Otherwise — exponential notation
        }
        // Formats numbers for display on the Y-axis in logarithmic mode
        function __cg_fmt_log_label(val) {
            // val is log10(original number)
            const approx = Math.pow(10, val); // Return approximate original number
            if (!isFinite(approx)) return val.toExponential(2); // If not finite — exponential notation
            if (approx < 1e6) return String(Math.round(approx)); // If less than 1 million — round
            return approx.toExponential(2); // Otherwise — exponential notation
        }
        // Formats the tooltip shown when hovering over the graph
        function __cg_tooltip_formatter(params) {
            const p = params[0];        // First element of the parameters (since it's an axis)
            const idx = p.dataIndex;    // Index of the point on the graph
            const orig = spis[idx];     // Original value from the list
            const step = idx + 1;       // Step number (starts from 1)
            const origStr = (typeof orig === 'bigint') ? orig.toString() : String(orig); // String value
            const isEven = (typeof orig === 'bigint') ? (orig % 2n === 0n) : (orig % 2 === 0); // Check if even
            const op = isEven ? '/ 2' : '* 3 + 1'; // Operation
            // Return an HTML string for the tooltip
            return `Step: ${step}<br>Value: ${toolTipShortenLocal(origStr)}<br>Operation: ${op}`;
        }

        // Filter only numeric elements from the list
        const spis = list.filter(x => typeof x === 'number' || typeof x === 'bigint');
        if (!spis.length) return; // If there are no numbers, exit

        // Determine whether to use logarithmic mode for display.
        // Heuristic: if the first value is a BigInt with length > 12 or number > 1e9 — use log.
        const first = spis[0];
        const forceLog = (typeof first === 'bigint' && first.toString().length > 12) || (typeof first === 'number' && first > 1e9);

        // Prepare data for the graph in linear and logarithmic formats
        const series_linear = []; // Array for linear values
        const series_log = [];    // Array for logarithmic values
        for (const v of spis) {
            const lin = __cg_to_linear(v); // Convert to linear format
            // If the linear value is Infinity, write null (the graph will ignore it)
            series_linear.push(lin === Infinity ? null : lin);
            series_log.push(__cg_to_log(v)); // Convert to logarithmic format
        }

        const useLog = forceLog; // Current mode (can be made switchable in the future)
        const seriesData = useLog ? series_log : series_linear; // Select data for display

        // If the graph doesn't exist yet — initialize it
        if (!graphInstance) {
            const el = document.getElementById('sim-graph'); // Find the graph element
            if (!el) return; // If the element is not found, exit
            // Initialize the graph in the element with id 'sim-graph' in dark theme
            graphInstance = echarts.init(el, 'dark');
            graphInstance.showLoading(); // Show loading indicator
        }

        // Graph settings
        const option = {
            title: { text: useLog ? 'Log chart' : 'Linear chart' }, // Title depending on the mode
            // Tooltip on hover
            tooltip: { trigger: 'axis', formatter: __cg_tooltip_formatter },
            // Toolbar (zoom, reset, save)
            toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, saveAsImage: {} } },
            // Zoom tools (mouse wheel and slider)
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { start: 0, end: 10 }],
            // X-axis (steps)
            xAxis: { type: 'category', name: 'Step', boundaryGap: false, data: spis.map((_, i) => i) },
            // Y-axis (values)
            yAxis: {
                type: 'value',
                name: useLog ? 'log10(Value)' : 'Value', // Axis label depending on the mode
                // Formatting of axis labels on Y
                axisLabel: { formatter: useLog ? __cg_fmt_log_label : __cg_fmt_linear_label }
            },
            // Data to display on the graph
            series: [{
                type: 'line',           // Line chart
                 seriesData,       // Selected data (linear or logarithmic)
                showSymbol: true,       // Show points
                symbol: 'circle',       // Shape of points
                symbolSize: 6,          // Size of points
                smooth: false,          // Do not smooth the line
                large: true             // Enable optimization for large data
            }]
        };

        // Apply settings to the graph (notMerge = true — replaces old ones)
        graphInstance.setOption(option, true);
        graphInstance.hideLoading(); // Hide the loading indicator
    }

    // Export the updateGraph function globally (for compatibility)
    window.updateGraph = function(list) { updateGraph_shim(list); };

    // Preserve the onNewList behavior (optional)
    window.CollatzApp.onNewList = function(list) {
        // Preserve the original behavior; we don't call drawGraph here by default
        // but we can update lastList and trigger a graph update if needed
        window.CollatzApp.lastList = list;
    };

}); // End of DOMContentLoaded

// ----------------------------
// Additional global helper functions (kept for backward compatibility)
// ----------------------------
// Function shortens long numbers (e.g., "123456...7890")
function shorten(numStr) {
    if (typeof numStr !== 'string') numStr = String(numStr); // If not a string — convert
    if (numStr.length <= 12) return numStr; // If shorter than 12 — return as is
    return numStr.slice(0, 6) + "..." + numStr.slice(-4); // Otherwise — shorten
}

// Function normalizes a value for the graph
function normalize(value) {
    if (typeof value === 'number') return value; // If it's a number — return as is
    try {
        // If the number fits into Number — return as Number
        if (value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
    } catch (e) {} // Ignore errors
    // Otherwise return the logarithm of the string length
    return Math.log10(String(value).length);
}

// Function shortens a value for the tooltip
function toolTipShorten(value) {
    const s = String(value); // Convert to string
    if (s.length <= 15) return s; // If shorter than 15 — return as is
    return s.slice(0, 6) + "..." + s.slice(-6); // Otherwise — shorten
}

// Function converts a number to logarithmic scale for the graph
function graphLogSize(value) {
    if (typeof value === 'number') {
        if (!isFinite(value)) return NaN; // If not finite — return NaN
        return Math.log10(Math.max(1, value)); // Log of a regular number
    }
    // Approximate log for BigInt
    const s = value.toString(); // Convert BigInt to string
    const k = 15; // Constant
    const leadStr = s.slice(0, k); // First 15 characters
    const leadNum = Number(leadStr); // As a number
    const len = s.length; // String length
    return Math.log10(leadNum) + (len - k); // Approximate logarithm
}

// Function formats a value for Y-axis labels
function yAxisValueShorten(value) {
    if (typeof value !== 'number' || !isFinite(value)) return ''; // If not a number or not finite — empty string
    let exp = Math.floor(value); // Integer part
    const frac = value - exp;    // Fractional part
    if (exp >= -3 && exp <= 6) { // If in a reasonable range
        const real = Math.round(Math.pow(10, value)); // Rounded number
        return String(real);
    }
    let mantissa = Math.pow(10, frac); // Mantissa
    let mantissaRounded = Number(mantissa.toFixed(2)); // Rounded mantissa
    if (mantissaRounded >= 10) { // If mantissa >= 10
        mantissaRounded = Number((mantissaRounded / 10).toFixed(2)); // Divide by 10
        exp += 1; // Increase exponent
    }
    // Format the mantissa string, removing zeros
    let mantissaStr = mantissaRounded % 1 === 0 ? String(mantissaRounded) : String(mantissaRounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
    const sign = exp >= 0 ? '+' : ''; // Exponent sign
    return `${mantissaStr}e${sign}${exp}`; // Return "mantissa e+exponent"
}

// Function formats a value for the Y-axis (shortened)
function formatOriginalForAxis(value, sigDigits = 2) {
    if (value === undefined) return ''; // If undefined — empty string
    if (typeof value === 'number') {
        if (!isFinite(value)) return ''; // If not finite — empty string
        if (Math.abs(value) <= 1e6) return String(Math.round(value)); // If <= 1e6 — round
        const parts = value.toExponential(sigDigits - 1).split('e'); // Split into mantissa and exponent
        const mant = parts[0].replace(/\.0+$/, ''); // Remove zeros from mantissa
        const exp = Number(parts[1]); // Exponent as a number
        const sign = exp >= 0 ? '+' : ''; // Sign
        return `${mant}e${sign}${exp}`; // Return "mantissa e+exponent"
    }
    const s = value.toString(); // Convert to string
    if (s.length <= 3) return s; // If shorter than 3 — return as is
    const exp = s.length - 1; // Exponent = length - 1
    const lead = s.slice(0, sigDigits); // First sigDigits characters
    let mantissa = Number(lead) / Math.pow(10, sigDigits - 1); // Mantissa
    let mantRounded = Number(mantissa.toFixed(2)); // Rounded mantissa
    if (mantRounded >= 10) mantRounded = Number((mantRounded / 10).toFixed(2)); // If >= 10 — divide by 10
    // Format the mantissa string, removing zeros
    const mantStr = mantRounded % 1 === 0 ? String(mantRounded) : String(mantRounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
    const sign = exp >= 0 ? '+' : ''; // Sign
    return `${mantStr}e${sign}${exp}`; // Return "mantissa e+exponent"
}