self.onmessage = (e) => {
    // 1. Получаем входное число
    let n = BigInt(e.data);

    const ONE = 1n;
    const TWO = 2n;
    const THREE = 3n;

    const spisok = [];
    let max = n;

    while (n !== ONE) {
        spisok.push(n);
        if (n > max) max = n;

        if (n % TWO === 0n) {
            n = n / TWO;
        } else {
            n = n * THREE + ONE;
        }
    }

    spisok.push(ONE);

    // 2. Отправляем результат обратно
    self.postMessage({
        spisok,
        steps: spisok.length,
        max
    });
};
