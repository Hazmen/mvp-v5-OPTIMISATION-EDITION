// chart.worker.js

self.onmessage = (e) => {
    const { spisok } = e.data;

    // ===== 1. Оставляем только числа =====
    const values = spisok.filter(
        v => typeof v === 'bigint' || typeof v === 'number'
    );

    // ===== 2. Логарифмирование (BigInt-safe) =====
    const logValues = values.map(graphLogSize);

    // ===== 3. Данные для tooltip =====
    const meta = values.map(v => ({
        value: v.toString(),
        isEven:
            typeof v === 'bigint'
                ? v % 2n === 0n
                : v % 2 === 0
    }));

    // ===== 4. Отправка =====
    self.postMessage({
        xAxis: values.map((_, i) => i),
        series: logValues,
        meta
    });
};

// ===== helpers =====

function graphLogSize(value) {
    if (typeof value === 'number') {
        return Math.log10(Math.max(1, value));
    }

    const s = value.toString();
    const k = 15;
    const lead = Number(s.slice(0, k));
    return Math.log10(lead) + (s.length - k);
}
