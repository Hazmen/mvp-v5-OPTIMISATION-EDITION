// index.js
document.addEventListener('DOMContentLoaded', () => {
    // Конфигурация режимов
    const modes = [
        { id: 'casual', name: 'Casual' },
        { id: 'linear', name: 'Linear Graph' },
        { id: 'map', name: 'Map' }
    ];
    
    let currentIndex = 0;
    const totalModes = modes.length;
    
    // Элементы DOM
    const modeLabel = document.querySelector('.modes-label');
    const leftArrow = document.querySelector('.toogle-left');
    const rightArrow = document.querySelector('.toogle-right');
    const dots = document.querySelectorAll('.mode-dot');
    const visModes = document.querySelectorAll('.vis-mode');
    
    // Функция обновления интерфейса
    function updateMode(index) {
        // Нормализуем индекс для бесконечной карусели
        const normalizedIndex = ((index % totalModes) + totalModes) % totalModes;
        
        // Обновляем текст
        modeLabel.textContent = `${modes[normalizedIndex].name}`;
        
        // Обновляем точки
        dots.forEach((dot, i) => {
            if (i === normalizedIndex) {
                dot.style.backgroundColor = 'white';
                dot.style.borderColor = 'white';
                dot.style.transform = 'scale(1.0)';
            } else {
                dot.style.backgroundColor = 'transparent';
                dot.style.borderColor = 'rgba(195, 195, 195, 0.6)';
                dot.style.transform = 'scale(1)';
            }
        });
        
        // Обновляем видимый режим визуализации
        visModes.forEach((mode, i) => {
            const modeId = mode.dataset.mode;
            if (modeId === modes[normalizedIndex].id) {
                mode.style.display = 'block';
                // Добавляем небольшую анимацию появления
                mode.style.animation = 'fadeIn 0.3s ease';
            } else {
                mode.style.display = 'none';
            }
        });
        
        currentIndex = normalizedIndex;
    }
    
    // Обработчики стрелок
    leftArrow.addEventListener('click', () => {
        updateMode(currentIndex - 1);
    });
    
    rightArrow.addEventListener('click', () => {
        updateMode(currentIndex + 1);
    });
    
    // Обработчики точек
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            updateMode(index);
        });
    });
    
    // Добавляем анимацию появления в CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0.3; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        
        .vis-mode {
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Инициализация
    updateMode(0);
    
    // Добавляем обработку клавиатуры (бонус!)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            leftArrow.click();
        } else if (e.key === 'ArrowRight') {
            rightArrow.click();
        }
    });
});