// main.js — переписанная версия (совместимая с вашим UI)
// Я оставил комментарии и уникальные локальные имена для внутренних вспомогательных функций,
// чтобы не конфликтовать с глобальными функциями в вашем проекте.

// Ждём полной загрузки HTML-документа перед выполнением скрипта
document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM ----
    // Находим элементы на странице по их классам или ID
    const inp = document.querySelector('.input');        // Поле ввода числа
    const counter = document.querySelector('.steps-count'); // Элемент для отображения количества шагов
    const steps = document.querySelector('.steps');       // Контейнер для вывода шагов последовательности
    const btn = document.querySelector('.btn');           // Кнопка запуска вычислений
    const maxstat = document.querySelector('.max-stat');  // Элемент для отображения максимального числа
    const copyBtn = document.querySelector('.copy');      // Кнопка копирования последовательности
    const currentNum = document.querySelector('.currentNumDig'); // Элемент для отображения текущего числа

    // Элементы, связанные со скоростью анимации
    const speedRange = document.getElementById('speed');      // Ползунок выбора скорости
    const valueLabel = document.getElementById('speedValue'); // Элемент, отображающий текущую скорость

    // ---- state ----
    // Переменные состояния приложения
    let currentSpeed = speedRange ? Number(speedRange.value) : 1; // Текущая выбранная скорость (по умолчанию 1)
    let stepSpeed = 750;      // Задержка между шагами в миллисекундах (изначально 750 мс)
    let isRunning = false;    // Флаг, показывает, запущен ли процесс вычислений
    let currentTimeout = null; // ID текущего таймера setTimeout, чтобы можно было его отменить

    // ---- global app object (keeps compatibility) ----
    // Глобальный объект для совместимости с другими частями приложения
    // Если объект уже существует, используем его, иначе создаём новый
    window.CollatzApp = window.CollatzApp || {};
    window.CollatzApp.lastList = []; // Хранит последнюю вычисленную последовательность
    // Функция, вызываемая при новой последовательности (по умолчанию null)
    window.CollatzApp.onNewList = window.CollatzApp.onNewList || null;

    // ---- input guard ----
    // Проверка ввода в поле inp: разрешаем вводить только цифры
    if (inp) { // Проверяем, существует ли элемент inp
        inp.addEventListener('beforeinput', e => { // Слушатель события перед вводом символа
            // Если введённый символ есть и он не является цифрой (0-9)
            if (e.data && !/^[0-9]+$/.test(e.data)) {
                e.preventDefault(); // Отменяем ввод символа
            }
        });
    }

    // ---- utils (global helpers retained) ----
    // Вспомогательная функция для сокращения длинных чисел при отображении
    function shortenNumForCND(value, mode = 'auto') {
        // Преобразуем значение в строку: для BigInt используем .toString(), для number - String()
        const str = (typeof value === 'bigint') ? value.toString() : String(value);
        // Если строка короче или равна 12 символам, возвращаем как есть
        if (str.length <= 12) return str;
        // Если режим 'dots', возвращаем строку в формате "123456...7890"
        if (mode === 'dots') return str.slice(0, 6) + '...' + str.slice(-4);
        // Если режим 'e', возвращаем экспоненциальную запись
        if (mode === 'e') {
            const first = str[0];       // Первая цифра
            const after = str.slice(1); // Остальная часть строки
            const exp = after.length;   // Длина оставшейся части = показатель степени
            return `${first}.${after.slice(0, 3)}e+${exp}`;
        }
        // Если режим 'auto' и строка короче или равна 15 символам
        if (mode === 'auto' && str.length <= 15) {
            const first = str[0];       // Первая цифра
            const after = str.slice(1); // Остальная часть
            const exp = after.length;   // Показатель степени
            return `${first}.${after.slice(0, 3)}e+${exp}`;
        }
        // Если ни одно из условий не подошло, возвращаем строку как есть
        return str;
    }

    // Вспомогательная функция: временно меняет текст элемента на заданное время
    function changeForASec(item, changetxt, time) {
        if (!item) return; // Если элемент не существует, выходим
        const old = item.textContent; // Сохраняем старый текст
        item.textContent = changetxt; // Меняем текст на новый
        // Через указанное время (time) возвращаем старый текст
        setTimeout(() => { item.innerHTML = old; }, time);
    }

    // ---- speed slider ----
    // Функция настраивает слушатель для ползунка скорости
    function speedRangeGetValue() {
        if (!speedRange) return; // Если ползунок не найден, выходим
        speedRange.addEventListener('input', () => { // При изменении значения ползунка
            currentSpeed = Number(speedRange.value); // Преобразуем значение в число
            // Обновляем отображение скорости, если элемент valueLabel существует
            valueLabel && (valueLabel.innerHTML = currentSpeed + 'x');
            // В зависимости от выбранной скорости устанавливаем задержку между шагами
            if (currentSpeed === 1) stepSpeed = 750;    // 1x — 750 мс
            else if (currentSpeed === 2) stepSpeed = 150; // 2x — 150 мс
            else if (currentSpeed === 3) stepSpeed = 50;  // 3x — 50 мс
            else if (currentSpeed === 4) stepSpeed = 10;  // 4x — 10 мс
            else if (currentSpeed === 5) stepSpeed = false; // 5x — без задержки (очень быстро)
        });
    }
    speedRangeGetValue(); // Вызываем функцию сразу после её определения

    // ---- parser ----
    // Функция проверяет и преобразует строку в число (Number или BigInt)
    function IntOrBigInt(inputValue) {
        // Если входное значение не строка, преобразуем его в строку
        if (typeof inputValue !== 'string') inputValue = String(inputValue);
        // Убираем пробелы по краям строки
        const s = inputValue.trim();
        // Проверяем, состоит ли строка только из цифр
        if (!/^[0-9]+$/.test(s)) return { error: "Введите положительное число." };
        // Убираем дробную часть (если есть)
        const normalized = s.split('.')[0];
        // Если длина строки больше 15 символов, используем BigInt (для очень больших чисел)
        if (normalized.length > 15) {
            try {
                // Пытаемся создать BigInt из строки
                return { value: BigInt(s), isBig: true };
            } catch (err) {
                // Если не получилось (например, ошибка синтаксиса), возвращаем ошибку
                return { error: "Число слишком большое." };
            }
        }
        // Иначе используем Number
        return { value: Number(s), isBig: false };
    }

    // ---- collatz generator ----
    // Функция вычисляет последовательность Коллатца для заданного числа
    function collatzSmart(n, isBig) {
        // Создаём список, начинающийся с начального числа
        const spisok = [n];
        // Определяем константы в зависимости от типа (number или bigint)
        const ONE = isBig ? 1n : 1;
        const TWO = isBig ? 2n : 2;
        const THREE = isBig ? 3n : 3;
        // Пока n не равно 1
        while (n !== ONE) {
            // Если n чётное
            if (n % TWO === (isBig ? 0n : 0)) {
                n = n / TWO;        // Делим на 2
            } else {
                n = n * THREE + ONE // Иначе: умножаем на 3 и прибавляем 1
            }
            // Добавляем новое значение в список
            spisok.push(n);
            // Если список стал слишком длинным — останавливаем
            if (spisok.length > 16000) {
                spisok.push('Отличное число, но шаги вызывают приступ у сайта!');
                break;
            }
        }
        // Если n стало 1, добавляем сообщение о завершении
        if (n === ONE) spisok.push("Цикл достигнут.");
        // Возвращаем список шагов
        return spisok;
    }

    // ---- copy button ----
    // Обработчик клика на кнопку копирования
    if (copyBtn) { // Проверяем, существует ли кнопка
        copyBtn.addEventListener('click', () => {
            // Парсим введённое значение из поля inp (или пустая строка, если inp пуст)
            const parsed = IntOrBigInt(inp.value || '');
            // Если была ошибка при парсинге
            if (parsed.error) {
                // Показываем ошибку на кнопке на 800 мс
                changeForASec(copyBtn, parsed.error, 800);
                return; // Выходим
            }
            // Вычисляем последовательность Коллатца
            const spisok = collatzSmart(parsed.value, parsed.isBig);
            // Фильтруем только числа (убираем строки типа "цикл достигнут")
            const numsOnly = spisok.filter(x => typeof x === 'number' || typeof x === 'bigint');
            // Объединяем числа в строку с переносами строк
            const textToCopy = numsOnly.join('\n');
            // Копируем текст в буфер обмена
            navigator.clipboard.writeText(textToCopy)
                // Если копирование прошло успешно
                .then(() => changeForASec(copyBtn, 'Скопировано!', 500)) // Показываем "Скопировано!" на 500 мс
                // Если произошла ошибка
                .catch(err => changeForASec(copyBtn, `Error: ${err}`, 800)); // Показываем ошибку на 800 мс
        });
    }

    // ---- playSteps ----
    // Вспомогательная функция: находит максимальное число в списке
    function maxOfList(list) {
        let max = null; // Начальное значение максимума — null
        // Проходим по каждому элементу списка
        for (const v of list) {
            // Проверяем, является ли элемент числом или BigInt
            if (typeof v === 'number' || typeof v === 'bigint') {
                // Если max ещё не установлен или текущий элемент больше max
                if (max === null || v > max) {
                    max = v; // Обновляем max
                }
            }
        }
        return max; // Возвращаем максимальное найденное число
    }

    // Функция анимирует шаги последовательности
    function playSteps(list, i = 0) {
        // Если достигли конца списка, останавливаем выполнение
        if (i >= list.length) {
            isRunning = false;  // Сбрасываем флаг запуска
            return;
        }
        // Берём текущий элемент из списка
        const value = list[i];
        // Создаём новый элемент <p> для отображения шага
        const p = document.createElement('p');
        // Если элемент — число, добавляем номер шага
        p.textContent = (typeof value === 'number' || typeof value === 'bigint') ? `${i + 1}. ${value}` : value;
        // Добавляем элемент в контейнер шагов
        steps.appendChild(p);
        // Прокручиваем контейнер шагов вниз, чтобы показать последний элемент
        steps.scrollTo({ top: steps.scrollHeight });

        // Берём подсписок от начала до текущего шага (включительно)
        const shown = list.slice(0, i + 1);
        // Считаем количество шагов (только числовые элементы)
        const stepsCount = shown.filter(x => typeof x === 'number' || typeof x === 'bigint').length;
        // Обновляем счётчик шагов на странице (если элемент существует)
        counter && (counter.textContent = `количество шагов: ${stepsCount}`);

        // Находим максимальное число среди показанных
        const max = maxOfList(shown);
        // Обновляем отображение максимального числа (если элемент существует)
        maxstat && (maxstat.textContent = `самое большое число: ${max === null ? '-' : String(max)}`);

        // Обновляем текущее число на индикаторе (если элемент существует)
        currentNum && (currentNum.textContent = (typeof value === 'number' || typeof value === 'bigint') ? shortenNumForCND(value, 'e') : '1');

        // Обновляем график с небольшой задержкой (50 мс), чтобы не блокировать UI
        setTimeout(() => updateGraph_shim(shown), 50);

        // Если процесс запущен и задержка между шагами не отключена
        if (isRunning && stepSpeed !== false) {
            // Устанавливаем таймер для следующего шага
            currentTimeout = setTimeout(() => playSteps(list, i + 1), stepSpeed);
        } else if (isRunning && stepSpeed === false) { // Если задержка отключена
            // Используем requestAnimationFrame для следующего шага, чтобы UI оставался отзывчивым
            requestAnimationFrame(() => playSteps(list, i + 1));
        }
    }

    // ---- main button ----
    // Обработчик клика на основную кнопку
    if (btn) { // Проверяем, существует ли кнопка
        btn.addEventListener('click', () => {
            steps.textContent = ''; // Очищаем контейнер шагов
            // Парсим введённое значение из поля inp (или пустая строка, если inp пуст)
            const parsed = IntOrBigInt(inp.value || '');
            // Если была ошибка при парсинге
            if (parsed.error) {
                steps.textContent = parsed.error; // Выводим ошибку в контейнер шагов
                return; // Выходим
            }
            // Вычисляем последовательность
            const spisok = collatzSmart(parsed.value, parsed.isBig);
            // Сохраняем последовательность в глобальный объект
            window.CollatzApp.lastList = spisok;
            // Если задана функция onNewList, вызываем её
            if (typeof window.CollatzApp.onNewList === 'function') window.CollatzApp.onNewList(spisok);
            // Если процесс уже запущен, останавливаем его
            if (isRunning && currentTimeout) {
                clearTimeout(currentTimeout); // Очищаем текущий таймер
                isRunning = false;            // Сбрасываем флаг
            }
            isRunning = true; // Устанавливаем флаг запуска
            playSteps(spisok); // Запускаем анимацию шагов
        });
    }

    // ---- helper: tooltip shortening ----
    // Вспомогательная функция для сокращения чисел в подсказках графика
    function toolTipShortenLocal(v) {
        const s = v.toString(); // Преобразуем значение в строку
        // Если строка короче или равна 15 символам, возвращаем как есть
        if (s.length <= 15) return s;
        // Иначе возвращаем первые 6 и последние 6 символов с "..."
        return s.slice(0, 6) + '...' + s.slice(-6);
    }

    // ---- helper: approx log of BigInt ----
    // Вспомогательная функция для приближённого вычисления логарифма BigInt
    function approxLog10BigIntLocal(big) {
        const s = big.toString(); // Преобразуем BigInt в строку
        const k = 15;             // Константа для определения начальной части числа
        const lead = Number(s.slice(0, k)); // Первые 15 цифр как число
        const len = s.length;               // Общая длина строки
        // Приближённый логарифм = лог10(первых 15 цифр) + (остаток длины)
        return Math.log10(lead) + (len - k);
    }

    // ---- GRAPH: unique-name updateGraph ----
    // Эта функция намеренно локально названа, чтобы избежать конфликтов.
    let graphInstance = null; // Переменная для хранения экземпляра графика
    function updateGraph_shim(list) {
        // Локальные вспомогательные функции внутри, чтобы избежать конфликта с глобальными
        // Преобразует значение в линейный формат (для оси Y в линейном режиме)
        function __cg_to_linear(v) {
            if (typeof v === 'number') return v; // Если обычное число, возвращаем как есть
            // BigInt -> Number если безопасно, иначе приближённо через leading digits * 10^(len-lead)
            try {
                const maxSafe = BigInt(Number.MAX_SAFE_INTEGER); // Максимальное безопасное число для Number
                if (v <= maxSafe) return Number(v); // Если BigInt помещается в Number, конвертируем
            } catch (e) { /* игнорируем ошибки */ }
            // Если слишком большое -> возвращаем Infinity (мы не будем использовать Infinity в данных)
            return Infinity;
        }
        // Преобразует значение в логарифмический формат (для оси Y в логарифмическом режиме)
        function __cg_to_log(v) {
            if (typeof v === 'number') return Math.log10(Math.max(1, v)); // Логарифм обычного числа
            return approxLog10BigIntLocal(v); // Приближённый логарифм BigInt
        }
        // Форматирует числа для отображения на оси Y в линейном режиме
        function __cg_fmt_linear_label(val) {
            if (!isFinite(val)) return ''; // Если не конечное число, возвращаем пустую строку
            if (Math.abs(val) < 1e6) return String(Math.round(val)); // Если меньше 1 млн — округляем
            return Number(val).toExponential(2); // Иначе — экспоненциальная запись
        }
        // Форматирует числа для отображения на оси Y в логарифмическом режиме
        function __cg_fmt_log_label(val) {
            // val — это log10(оригинального числа)
            const approx = Math.pow(10, val); // Возвращаем приблизительное исходное число
            if (!isFinite(approx)) return val.toExponential(2); // Если не конечное — экспоненциальная запись
            if (approx < 1e6) return String(Math.round(approx)); // Если меньше 1 млн — округляем
            return approx.toExponential(2); // Иначе — экспоненциальная запись
        }
        // Форматирует всплывающую подсказку при наведении на график
        function __cg_tooltip_formatter(params) {
            const p = params[0];        // Первый элемент параметров (т.к. ось)
            const idx = p.dataIndex;    // Индекс точки на графике
            const orig = spis[idx];     // Оригинальное значение из списка
            const step = idx + 1;       // Номер шага (начинается с 1)
            const origStr = (typeof orig === 'bigint') ? orig.toString() : String(orig); // Строка значения
            const isEven = (typeof orig === 'bigint') ? (orig % 2n === 0n) : (orig % 2 === 0); // Проверка чётности
            const op = isEven ? '/ 2' : '* 3 + 1'; // Операция
            // Возвращаем HTML-строку для подсказки
            return `Step: ${step}<br>Value: ${toolTipShortenLocal(origStr)}<br>Operation: ${op}`;
        }

        // Фильтруем только числовые элементы из списка
        const spis = list.filter(x => typeof x === 'number' || typeof x === 'bigint');
        if (!spis.length) return; // Если нет чисел, выходим

        // Определяем, использовать ли логарифмический режим отображения.
        // Эвристика: если первое значение — BigInt с длиной > 12 или number > 1e9 — используем лог.
        const first = spis[0];
        const forceLog = (typeof first === 'bigint' && first.toString().length > 12) || (typeof first === 'number' && first > 1e9);

        // Подготавливаем данные для графика в линейном и логарифмическом формате
        const series_linear = []; // Массив для линейных значений
        const series_log = [];    // Массив для логарифмических значений
        for (const v of spis) {
            const lin = __cg_to_linear(v); // Преобразуем в линейный формат
            // Если линейное значение — Infinity, записываем null (график проигнорирует)
            series_linear.push(lin === Infinity ? null : lin);
            series_log.push(__cg_to_log(v)); // Преобразуем в логарифмический формат
        }

        const useLog = forceLog; // Текущий режим (в будущем можно сделать переключаемым)
        const seriesData = useLog ? series_log : series_linear; // Выбираем данные для отображения

        // Если графика ещё нет — инициализируем его
        if (!graphInstance) {
            const el = document.getElementById('sim-graph'); // Находим элемент для графика
            if (!el) return; // Если элемент не найден, выходим
            // Инициализируем график в элементе с id 'sim-graph' в темной теме
            graphInstance = echarts.init(el, 'dark');
            graphInstance.showLoading(); // Показываем индикатор загрузки
        }

        // Настройки графика
        const option = {
            title: { text: useLog ? 'Log chart' : 'Linear chart' }, // Заголовок в зависимости от режима
            // Подсказка при наведении
            tooltip: { trigger: 'axis', formatter: __cg_tooltip_formatter },
            // Панель инструментов (масштаб, сброс, сохранить)
            toolbox: { feature: { dataZoom: { yAxisIndex: 'none' }, restore: {}, saveAsImage: {} } },
            // Инструменты масштабирования (колесо мыши и ползунок)
            dataZoom: [{ type: 'inside', start: 0, end: 100 }, { start: 0, end: 10 }],
            // Ось X (шаги)
            xAxis: { type: 'category', name: 'Step', boundaryGap: false, data: spis.map((_, i) => i) },
            // Ось Y (значения)
            yAxis: {
                type: 'value',
                name: useLog ? 'log10(Value)' : 'Value', // Подпись оси в зависимости от режима
                // Форматирование подписей на оси Y
                axisLabel: { formatter: useLog ? __cg_fmt_log_label : __cg_fmt_linear_label }
            },
            // Данные для отображения на графике
            series: [{
                type: 'line',           // Линейный график
                data: seriesData,       // Выбранные данные (линейные или логарифмические)
                showSymbol: true,       // Показывать точки
                symbol: 'circle',       // Форма точек
                symbolSize: 6,          // Размер точек
                smooth: false,          // Не сглаживать линию
                large: true             // Включить оптимизацию для больших данных
            }]
        };

        // Применяем настройки к графику (notMerge = true — заменяет старые)
        graphInstance.setOption(option, true);
        graphInstance.hideLoading(); // Скрываем индикатор загрузки
    }

    // Экспортируем функцию updateGraph глобально (для совместимости)
    window.updateGraph = function(list) { updateGraph_shim(list); };

    // Сохраняем поведение onNewList (по желанию)
    window.CollatzApp.onNewList = function(list) {
        // Сохраняем оригинальное поведение; мы не вызываем drawGraph здесь по умолчанию
        // но можем обновить lastList и вызвать обновление графика при необходимости
        window.CollatzApp.lastList = list;
    };

}); // Конец DOMContentLoaded

// ----------------------------
// Дополнительные глобальные вспомогательные функции (оставлены для обратной совместимости)
// ----------------------------
// Функция сокращает длинные числа (например, "123456...7890")
function shorten(numStr) {
    if (typeof numStr !== 'string') numStr = String(numStr); // Если не строка — преобразуем
    if (numStr.length <= 12) return numStr; // Если короче 12 — возвращаем как есть
    return numStr.slice(0, 6) + "..." + numStr.slice(-4); // Иначе — сокращаем
}

// Функция нормализует значение для графика
function normalize(value) {
    if (typeof value === 'number') return value; // Если число — возвращаем как есть
    try {
        // Если число помещается в Number — возвращаем как Number
        if (value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
    } catch (e) {} // Игнорируем ошибки
    // Иначе возвращаем логарифм длины строки
    return Math.log10(String(value).length);
}

// Функция сокращает значение для всплывающей подсказки
function toolTipShorten(value) {
    const s = String(value); // Преобразуем в строку
    if (s.length <= 15) return s; // Если короче 15 — возвращаем как есть
    return s.slice(0, 6) + "..." + s.slice(-6); // Иначе — сокращаем
}

// Функция преобразует число в логарифмический масштаб для графика
function graphLogSize(value) {
    if (typeof value === 'number') {
        if (!isFinite(value)) return NaN; // Если не конечное — возвращаем NaN
        return Math.log10(Math.max(1, value)); // Логарифм обычного числа
    }
    // Приближённый логарифм для BigInt
    const s = value.toString(); // Преобразуем BigInt в строку
    const k = 15; // Константа
    const leadStr = s.slice(0, k); // Первые 15 символов
    const leadNum = Number(leadStr); // Как число
    const len = s.length; // Длина строки
    return Math.log10(leadNum) + (len - k); // Приближённый логарифм
}

// Функция форматирует значение для подписей на оси Y
function yAxisValueShorten(value) {
    if (typeof value !== 'number' || !isFinite(value)) return ''; // Если не число или не конечное — пустая строка
    let exp = Math.floor(value); // Целая часть
    const frac = value - exp;    // Дробная часть
    if (exp >= -3 && exp <= 6) { // Если в разумном диапазоне
        const real = Math.round(Math.pow(10, value)); // Округлённое число
        return String(real);
    }
    let mantissa = Math.pow(10, frac); // Мантисса
    let mantissaRounded = Number(mantissa.toFixed(2)); // Округлённая мантисса
    if (mantissaRounded >= 10) { // Если мантисса >= 10
        mantissaRounded = Number((mantissaRounded / 10).toFixed(2)); // Делим на 10
        exp += 1; // Увеличиваем экспоненту
    }
    // Форматируем строку мантиссы, убирая нули
    let mantissaStr = mantissaRounded % 1 === 0 ? String(mantissaRounded) : String(mantissaRounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
    const sign = exp >= 0 ? '+' : ''; // Знак экспоненты
    return `${mantissaStr}e${sign}${exp}`; // Возвращаем "мантисса e+экспонента"
}

// Функция форматирует значение для оси Y (сокращённо)
function formatOriginalForAxis(value, sigDigits = 2) {
    if (value === undefined) return ''; // Если undefined — пустая строка
    if (typeof value === 'number') {
        if (!isFinite(value)) return ''; // Если не конечное — пустая строка
        if (Math.abs(value) <= 1e6) return String(Math.round(value)); // Если <= 1e6 — округляем
        const parts = value.toExponential(sigDigits - 1).split('e'); // Разбиваем на мантиссу и экспоненту
        const mant = parts[0].replace(/\.0+$/, ''); // Убираем нули из мантиссы
        const exp = Number(parts[1]); // Экспонента как число
        const sign = exp >= 0 ? '+' : ''; // Знак
        return `${mant}e${sign}${exp}`; // Возвращаем "мантисса e+экспонента"
    }
    const s = value.toString(); // Преобразуем в строку
    if (s.length <= 3) return s; // Если короче 3 — возвращаем как есть
    const exp = s.length - 1; // Экспонента = длина - 1
    const lead = s.slice(0, sigDigits); // Первые sigDigits символов
    let mantissa = Number(lead) / Math.pow(10, sigDigits - 1); // Мантисса
    let mantRounded = Number(mantissa.toFixed(2)); // Округлённая мантисса
    if (mantRounded >= 10) mantRounded = Number((mantRounded / 10).toFixed(2)); // Если >= 10 — делим на 10
    // Форматируем строку мантиссы, убирая нули
    const mantStr = mantRounded % 1 === 0 ? String(mantRounded) : String(mantRounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
    const sign = exp >= 0 ? '+' : ''; // Знак
    return `${mantStr}e${sign}${exp}`; // Возвращаем "мантисса e+экспонента"
}