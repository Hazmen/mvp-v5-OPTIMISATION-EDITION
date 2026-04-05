// ========================= COLLATZ =========================
        const inp     = document.getElementById('input');
        const runBtn  = document.getElementById('runBtn');
        const chartEl = document.getElementById('chart');

        let useLogScale = false;
        let currentSequence = [];

        function setScale(mode) {
            useLogScale = (mode === 'log');
            document.getElementById('btnLinear').classList.toggle('active', !useLogScale);
            document.getElementById('btnLog').classList.toggle('active',  useLogScale);
            if (currentSequence.length) renderGraph(currentSequence, useLogScale);
        }

        inp.addEventListener('beforeinput', e => {
            if (e.data && !/^[0-9]+$/.test(e.data)) e.preventDefault();
        });

        function collatzBigInt(n) {
            const seq = [];
            if (n === 0n) return seq;
            while (true) {
                seq.push(n);
                if (n === 1n) break;
                n = (n % 2n === 0n) ? n / 2n : n * 3n + 1n;
                if (seq.length > 50000) break;
            }
            return seq;
        }

        // Computes log10 of a BigInt accurately even for astronomically large values.
        // Works by reading the first 15 significant digits plus the digit-length offset.
        function bigIntLog10(value) {
            const s = value.toString();
            const k = 15;
            if (s.length <= k) return Math.log10(Number(s));
            const lead = Number(s.slice(0, k));
            return Math.log10(lead) + (s.length - k);
        }

        function toolTipShorten(value) {
            const s = value.toString();
            if (s.length <= 15) return s;
            return `${s.slice(0, 6)}...${s.slice(-6)}`;
        }

        function formatAxisLabel(v) {
            if (v <= 0) return '';
            if (v < 1e6) return Math.round(v).toLocaleString('en-US');
            const exp = Math.floor(Math.log10(v));
            const mant = (v / Math.pow(10, exp)).toFixed(1).replace(/\.0$/, '');
            return `${mant}e+${exp}`;
        }

        // For log mode: v is the log10 of the real value → show back the real value
        function formatLogAxisLabel(v) {
            if (v < 0) return '';
            if (v === 0) return '1';
            const actual = Math.pow(10, v);
            if (actual < 1e4) return Math.round(actual).toLocaleString('en-US');
            const exp = Math.round(v);
            if (Math.abs(v - exp) < 0.02) return `10^${exp}`;
            return `10^${v.toFixed(1)}`;
        }

        function calculateSmartZoom(sequence, isLog) {
            if (isLog || sequence.length <= 50) return { start: 0, end: 100 };
            let max = 0n;
            for (const x of sequence) if (x > max) max = x;
            const threshold = max / 100n;
            let peakIndex = sequence.indexOf(max);
            if (peakIndex === -1) peakIndex = 0;
            for (let i = peakIndex; i < sequence.length; i++) {
                if (sequence[i] < threshold) {
                    const end = Math.min(100, Math.round((i + 30) / sequence.length * 100));
                    return { start: 0, end };
                }
            }
            return { start: 0, end: 100 };
        }

        let chart;

        function renderGraph(sequence, isLog) {
            // ---- Y data ----
            // Log mode: pre-transform with bigIntLog10 so very large BigInts are handled,
            //           then use yAxis type:'value' (NOT 'log') — otherwise ECharts would
            //           apply log a second time and the scale would be wrong.
            // Linear mode: convert BigInt → Number (approximate for huge values).
            const yData = isLog
                ? sequence.map(bigIntLog10)
                : sequence.map(x => {
                    const s = x.toString();
                    if (s.length <= 15) return Number(x);
                    return Number(s.slice(0, 15)) * Math.pow(10, s.length - 15);
                });

            const zoom = calculateSmartZoom(sequence, isLog);
            const LINE  = '#d81ae8';
            const GLOW  = '#e24bde';

            const allSteps = sequence.map((val, idx) => {
                const op = val % 2n === 0n ? '÷2' : '×3+1';
                return `${idx.toString().padStart(4)} │ ${toolTipShorten(val).padEnd(22)} │ ${op}`;
            }).join('\n');

            const maxVal = sequence.reduce((a, b) => a > b ? a : b, 0n);
            const statsText = [
                '📊 Collatz Sequence Stats',
                '━━━━━━━━━━━━━━━━━━━━━━',
                `Start : ${toolTipShorten(sequence[0] || 0n)}`,
                `Steps : ${sequence.length}`,
                `Max   : ${toolTipShorten(maxVal)}`,
                `→ 1   : ${sequence[sequence.length - 1] === 1n ? '✅ Yes' : '❌ Not reached'}`,
                '━━━━━━━━━━━━━━━━━━━━━━',
            ].join('\n');

            const option = {
                backgroundColor: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: '#080510' },
                        { offset: 1, color: '#0b080f' }
                    ]
                },

                title: {
                    text: isLog ? 'Log₁₀ Scale' : 'Linear Scale',
                    left: 'center', top: 10,
                    textStyle: { color: '#8b5cf6', fontSize: 13, fontFamily: 'Inter,sans-serif', fontWeight: '500' }
                },

                tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(15, 8, 28, 0.95)',
                    borderColor: LINE,
                    borderWidth: 1.5,
                    borderRadius: 10,
                    textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter,sans-serif' },
                    padding: [10, 14],
                    extraCssText: 'box-shadow: 0 0 20px rgba(216,26,232,0.35);',
                    formatter(params) {
                        const idx = params[0].dataIndex;
                        const val = sequence[idx];
                        const isEven = val % 2n === 0n;
                        const realVal = toolTipShorten(val);
                        const logLine = isLog
                            ? `<div style="color:#a78bfa;font-size:11px">log₁₀ ≈ ${params[0].value.toFixed(4)}</div>`
                            : '';
                        return `<div style="font-weight:600;margin-bottom:4px">Step #${idx}</div>
                                <div style="font-family:monospace">${realVal}</div>
                                ${logLine}
                                <div style="color:${isEven ? '#34d399' : '#f87171'};margin-top:2px">
                                    ${isEven ? '÷ 2' : '× 3 + 1'}
                                </div>`;
                    }
                },

                toolbox: {
                    right: 18, top: 5,
                    feature: {
                        dataZoom: { yAxisIndex: 'none', title: { zoom: 'Zoom', back: 'Reset' } },
                        restore:  { title: 'Restore' },
                        saveAsImage: { title: 'Save', name: 'collatz-graph' },
                        dataView: {
                            show: true, readOnly: true, title: 'Data',
                            lang: [
                                '<span style="font-family:Inter,sans-serif;font-weight:700;font-size:18px">Sequence Data</span>',
                                '<span style="font-family:Inter,sans-serif;font-size:13px">✕ Close</span>',
                                '⟳'
                            ],
                            backgroundColor: '#0d0b14',
                            textColor: '#ddd',
                            buttonColor: LINE,
                            buttonTextColor: '#fff',
                            optionToContent: () => `
                                <div style="font-family:'Fira Code',monospace;font-size:11px;
                                            background:linear-gradient(180deg,#0d0b14,#130f1e);
                                            padding:16px;border-radius:10px;border:1px solid #2d2040">
                                    <pre style="margin:0;color:#a78bfa">${statsText}</pre>
                                    <hr style="border-color:#2d2040;margin:10px 0">
                                    <pre style="margin:0;max-height:420px;overflow:auto;line-height:1.5;
                                               white-space:pre;color:#ddd">Step │ Value                 │ Op\n─────┴───────────────────────┴────\n${allSteps}</pre>
                                </div>`
                        }
                    },
                    iconStyle: { borderColor: '#555', color: 'transparent' }
                },

                dataZoom: [
                    { type: 'inside', start: 0, end: 100, zoomOnMouseWheel: 'shift', moveOnMouseMove: true },
                    {
                        type: 'slider',
                        start: zoom.start, end: zoom.end,
                        height: 28, bottom: 12,
                        backgroundColor: 'rgba(30,20,50,0.4)',
                        fillerColor: 'rgba(216,26,232,0.2)',
                        borderColor: 'transparent',
                        handleStyle: {
                            color: LINE, borderColor: GLOW,
                            borderRadius: 30, borderWidth: 2,
                            shadowBlur: 8, shadowColor: GLOW
                        }
                    }
                ],

                grid: { left: '9%', right: '2%', top: '13%', bottom: '18%' },

                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: sequence.map((_, i) => i),
                    name: 'Steps',
                    nameLocation: 'middle',
                    nameGap: 26,
                    nameTextStyle: { color: '#888', fontSize: 11 },
                    axisLine: { lineStyle: { color: '#3a3050' } },
                    axisLabel: { color: '#888', fontSize: 11, interval: 'auto', hideOverlap: true },
                    splitLine: { show: true, lineStyle: { color: '#1e1830', type: 'dashed' } }
                },

                yAxis: {
                    // Always 'value' — log transform is already baked into yData when isLog=true
                    type: 'value',
                    name: isLog ? 'log₁₀(Value)' : 'Value',
                    nameLocation: 'end',
                    nameGap: 12,
                    nameTextStyle: { color: '#888', fontSize: 11 },
                    axisLine: { lineStyle: { color: '#3a3050' } },
                    axisLabel: {
                        color: '#888', fontSize: 11,
                        formatter: isLog ? formatLogAxisLabel : formatAxisLabel
                    },
                    splitLine: { show: true, lineStyle: { color: '#1e1830', type: 'dashed' } },
                    scale: true
                },

                series: [{
                    name: 'Collatz',
                    type: 'line',
                    data: yData,
                    showSymbol: false,
                    symbol: 'circle',
                    symbolSize: 4,
                    smooth: 0,
                    lineStyle: { color: LINE, width: 2, shadowColor: GLOW, shadowBlur: 10 },
                    itemStyle: {
                        color: LINE, borderColor: '#fff', borderWidth: 1.5,
                        shadowColor: GLOW, shadowBlur: 8
                    },
                    areaStyle: {
                        color: {
                            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(216,26,232,0.22)' },
                                { offset: 1, color: 'rgba(216,26,232,0.01)' }
                            ]
                        }
                    },
                    emphasis: { lineStyle: { width: 2.5 }, itemStyle: { borderWidth: 2.5, shadowBlur: 16 } },
                    markPoint: {
                        data: [
                            { type: 'max', name: 'Peak',
                              label: { formatter: (p) => `★ ${toolTipShorten(sequence[p.dataIndex] ?? 0n)}`, color: '#fde68a', fontSize: 11 },
                              itemStyle: { color: 'rgba(20,10,35,0.85)', borderColor: '#fbbf24', borderWidth: 1.5 }
                            }
                        ]
                    }
                }]
            };

            if (!chart) {
                chart = echarts.init(chartEl, null, { renderer: 'canvas' });
            }
            chart.setOption(option, true);
        }

        // ========================= PIE CHART =========================
        let pieChart;
        function initPieChart() {
            const ctx = document.getElementById('pieChart').getContext('2d');
            pieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Even', 'Odd'],
                    datasets: [{ data: [72, 28], backgroundColor: ['#06b6d4', '#5b21b6'], borderWidth: 0, hoverOffset: 4 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '70%',
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }
                }
            });
        }

        // ========================= STATISTICS =========================
        function updateInterface(sequence) {
            if (!sequence.length) return;

            const maxVal    = sequence.reduce((a, b) => a > b ? a : b, 0n);
            const peakIndex = sequence.indexOf(maxVal);
            const totalSteps = sequence.length - 1;
            const growth    = maxVal / sequence[0];

            let maxUp = 0, maxDown = 0, curUp = 0, curDown = 0;
            for (let i = 1; i < sequence.length; i++) {
                if (sequence[i] > sequence[i - 1]) { curUp++;   curDown = 0; maxUp   = Math.max(maxUp,   curUp);   }
                else                                { curDown++; curUp   = 0; maxDown = Math.max(maxDown, curDown); }
            }

            const sum  = sequence.reduce((a, v) => a + v, 0n);
            const avg  = sum / BigInt(sequence.length);
            const sorted = [...sequence].sort((a, b) => a < b ? -1 : 1);
            const mid  = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2n;

            let even = 0, odd = 0;
            sequence.forEach(v => { if (v % 2n === 0n) even++; else odd++; });
            const evenPct = ((even / sequence.length) * 100).toFixed(0);
            const oddPct  = ((odd  / sequence.length) * 100).toFixed(0);

            const fmt = (n) => {
                const s = n.toString();
                if (s.length <= 15) return BigInt(n).toLocaleString('en-US');
                return `${s.slice(0, 6)}…${s.slice(-6)}`;
            };

            document.getElementById('card-steps').textContent  = totalSteps;
            document.getElementById('card-peak').textContent   = fmt(maxVal);
            document.getElementById('card-growth').textContent = `${growth}x`;

            document.getElementById('stat-start').textContent     = fmt(sequence[0]);
            document.getElementById('stat-steps').textContent     = totalSteps;
            document.getElementById('stat-peak').textContent      = fmt(maxVal);
            document.getElementById('stat-peak-step').textContent = peakIndex;
            document.getElementById('stat-growth').textContent    = `${growth}x`;
            document.getElementById('stat-time-peak').textContent = `${peakIndex} steps`;
            document.getElementById('stat-streak-up').textContent   = `${maxUp}↑`;
            document.getElementById('stat-streak-down').textContent = `${maxDown}↓`;
            document.getElementById('stat-avg').textContent    = fmt(avg);
            document.getElementById('stat-median').textContent = fmt(median);

            document.getElementById('pct-even').textContent     = `${evenPct}%`;
            document.getElementById('pct-odd').textContent      = `${oddPct}%`;
            document.getElementById('pie-center-text').textContent = `${evenPct}%`;

            if (pieChart) {
                pieChart.data.datasets[0].data = [even, odd];
                pieChart.update();
            }
        }

        // ========================= RUN =========================
        runBtn.addEventListener('click', () => {
            const val = inp.value.trim();
            if (!val) { inp.focus(); return; }
            try {
                const n = BigInt(val);
                currentSequence = collatzBigInt(n);
                renderGraph(currentSequence, useLogScale);
                updateInterface(currentSequence);
            } catch (e) {
                console.error(e);
                alert('Invalid input. Please enter a positive integer.');
            }
        });

        inp.addEventListener('keydown', e => { if (e.key === 'Enter') runBtn.click(); });

        window.addEventListener('resize', () => { if (chart) chart.resize(); });

        // Load Chart.js then auto-run
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.onload = () => { initPieChart(); runBtn.click(); };
        document.head.appendChild(s);