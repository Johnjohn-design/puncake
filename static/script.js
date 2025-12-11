// Глобальні змінні
let ingredients = {};
let currentRecipe = [];

// ==================== ОСНОВНІ ФУНКЦІЇ ====================

// Завантажити інгредієнти при запуску
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM завантажено');
    loadIngredients();
    
    // Ініціалізувати лічильник
    updateCounterDisplay();
});

// Завантажити інгредієнти з сервера
async function loadIngredients() {
    try {
        console.log('🔄 Завантажую інгредієнти...');
        const response = await fetch('/api/ingredients');
        
        if (!response.ok) {
            throw new Error('Помилка сервера: ' + response.status);
        }
        
        const data = await response.json();
        
        if (data.success) {
            ingredients = data.ingredients || {};
            console.log('✅ Інгредієнтів завантажено:', Object.keys(ingredients).length);
            
            // Оновити всі елементи інтерфейсу
            updateIngredientsList();
            updateRecipeSelect();
            updateStats(); // Додаємо оновлення статистики
            
            showNotification('✅ Дані завантажено', 'success');
        } else {
            throw new Error(data.error || 'Невідома помилка');
        }
    } catch (error) {
        console.error('❌ Помилка завантаження:', error);
        showNotification('❌ Помилка: ' + error.message, 'error');
    }
}

// Додати новий інгредієнт
async function addIngredient() {
    const nameInput = document.getElementById('ingredientName');
    const priceInput = document.getElementById('ingredientPrice');
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    
    console.log('🔄 Додаю інгредієнт:', { name, price });
    
    // Валідація
    if (!name) {
        showNotification('❌ Введіть назву інгредієнта', 'error');
        nameInput.focus();
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        showNotification('❌ Введіть коректну ціну', 'error');
        priceInput.focus();
        return;
    }
    
    try {
        const response = await fetch('/api/ingredients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: name, price: price })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Очистити поля
            nameInput.value = '';
            priceInput.value = '';
            
            // Оновити список
            await loadIngredients();
            
            showNotification('✅ Інгредієнт додано: ' + name, 'success');
        } else {
            showNotification('❌ Помилка: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Помилка:', error);
        showNotification('❌ Помилка з\'єднання', 'error');
    }
}

// Видалити інгредієнт
async function deleteIngredient(name) {
    if (!confirm('Видалити "' + name + '"?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/ingredients/${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadIngredients();
            showNotification('✅ Інгредієнт видалено', 'success');
        } else {
            showNotification('❌ Помилка: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Помилка:', error);
        showNotification('❌ Помилка з\'єднання', 'error');
    }
}

// Додати інгредієнт до рецепту
function addToRecipe() {
    const ingredientSelect = document.getElementById('recipeIngredient');
    const gramsInput = document.getElementById('recipeGrams');
    
    const name = ingredientSelect.value;
    const grams = parseFloat(gramsInput.value);
    
    console.log('🔄 Додаю до рецепту:', { name, grams });
    
    // Валідація
    if (!name) {
        showNotification('❌ Оберіть інгредієнт', 'error');
        return;
    }
    
    if (isNaN(grams) || grams <= 0) {
        showNotification('❌ Введіть коректну кількість', 'error');
        gramsInput.focus();
        return;
    }
    
    // Розрахунок вартості
    const pricePerKg = ingredients[name];
    const cost = (pricePerKg / 1000) * grams;
    
    // Додати до рецепту
    currentRecipe.push({
        name: name,
        grams: grams,
        cost: cost
    });
    
    // Оновити таблицю
    updateRecipeTable();
    
    // Оновити лічильник рецепту
    updateRecipeCounter();
    
    // Очистити поле грамів
    gramsInput.value = '';
    
    showNotification('✅ Додано до рецепту: ' + name, 'success');
}

// Видалити з рецепту
function removeFromRecipe(index) {
    currentRecipe.splice(index, 1);
    updateRecipeTable();
    updateRecipeCounter();
    showNotification('✅ Видалено з рецепту', 'success');
}

// Розрахувати вартість рецепту
async function calculateRecipe() {
    if (currentRecipe.length === 0) {
        showNotification('❌ Рецепт порожній', 'error');
        return;
    }
    
    console.log('🧮 Розраховую рецепт...');
    
    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: currentRecipe.map(item => ({
                    name: item.name,
                    grams: item.grams
                }))
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const result = data.result;
            
            // Оновити результати
            document.getElementById('totalCost').textContent = result.total_cost.toFixed(2);
            document.getElementById('totalWeight').textContent = result.total_weight.toFixed(0);
            document.getElementById('costPer100g').textContent = result.cost_per_100g.toFixed(2);
            
            // Додати вартість за кг (якщо є в результаті)
            if (result.cost_per_kg) {
                document.getElementById('costPerKg').textContent = result.cost_per_kg.toFixed(2) + ' грн';
            } else {
                // Розрахувати вручну
                const costPerKg = (result.total_cost / result.total_weight) * 1000;
                document.getElementById('costPerKg').textContent = costPerKg.toFixed(2) + ' грн';
            }
            
            // Додати деталі
            updateDetailedResults(result);
            
            // Оновити лічильник розрахунків
            updateCalculationCounter();
            
            showNotification('✅ Розраховано: ' + result.total_cost.toFixed(2) + ' грн', 'success');
        } else {
            showNotification('❌ Помилка: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('❌ Помилка:', error);
        showNotification('❌ Помилка розрахунку', 'error');
    }
}

// Очистити рецепт
function clearRecipe() {
    if (currentRecipe.length === 0) return;
    
    if (confirm('Очистити весь рецепт?')) {
        currentRecipe = [];
        updateRecipeTable();
        updateRecipeCounter();
        
        // Скинути результати
        document.getElementById('totalCost').textContent = '0.00';
        document.getElementById('totalWeight').textContent = '0';
        document.getElementById('costPer100g').textContent = '0.00';
        document.getElementById('costPerKg').textContent = '0.00 грн';
        document.getElementById('detailedResults').innerHTML = '';
        
        showNotification('✅ Рецепт очищено', 'success');
    }
}

// ==================== ДОПОМІЖНІ ФУНКЦІЇ ====================

// Оновити список інгредієнтів
function updateIngredientsList() {
    const tbody = document.getElementById('ingredientsList');
    tbody.innerHTML = '';
    
    const ingredientKeys = Object.keys(ingredients);
    
    if (ingredientKeys.length === 0) {
        // Показати порожній стан
        tbody.innerHTML = `
            <tr id="noIngredientsRow">
                <td colspan="3" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                    Немає доданих інгредієнтів
                </td>
            </tr>
        `;
    } else {
        for (const name of ingredientKeys) {
            const price = ingredients[name];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${name}</td>
                <td>${price.toFixed(2)} грн</td>
                <td>
                    <button class="action-btn action-delete" onclick="deleteIngredient('${name}')">
                        <i class="fas fa-trash-alt"></i>
                        Видалити
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        }
    }
}

// Оновити випадаючий список для рецепту
function updateRecipeSelect() {
    const select = document.getElementById('recipeIngredient');
    select.innerHTML = '<option value="">Оберіть інгредієнт...</option>';
    
    for (const [name, price] of Object.entries(ingredients)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = `${name} (${price.toFixed(2)} грн/кг)`;
        select.appendChild(option);
    }
}

// Оновити таблицю рецепту
function updateRecipeTable() {
    const tbody = document.getElementById('recipeList');
    tbody.innerHTML = '';
    
    if (currentRecipe.length === 0) {
        // Показати порожній стан
        tbody.innerHTML = `
            <tr id="noRecipeRow">
                <td colspan="4" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                    Рецепт порожній. Додайте інгредієнти.
                </td>
            </tr>
        `;
    } else {
        currentRecipe.forEach((item, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.grams} г</td>
                <td>${item.cost.toFixed(2)} грн</td>
                <td>
                    <button class="action-btn action-delete" onclick="removeFromRecipe(${index})">
                        <i class="fas fa-times"></i>
                        Видалити
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
}

// Оновити детальні результати
function updateDetailedResults(result) {
    const container = document.getElementById('detailedResults');
    
    if (result.details && result.details.length > 0) {
        let html = '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e8edf2;">';
        html += '<h4 style="margin-bottom: 10px; color: #34495e; font-size: 14px;"><i class="fas fa-list-ol"></i> Детальний розклад:</h4>';
        html += '<div style="font-size: 13px;">';
        
        result.details.forEach(item => {
            const percentage = result.total_cost > 0 ? ((item.cost / result.total_cost) * 100).toFixed(1) : '0.0';
            html += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                    <span>${item.name}</span>
                    <span>
                        ${item.grams}г = ${item.cost} грн (${percentage}%)
                    </span>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    } else {
        container.innerHTML = '';
    }
}

// Оновити статистику
function updateStats() {
    const ingredientCount = Object.keys(ingredients).length;
    
    // Оновити лічильник інгредієнтів
    document.getElementById('ingredientCount').textContent = ingredientCount;
    document.getElementById('totalIngredients').textContent = ingredientCount;
    
    // Оновити середню ціну
    if (ingredientCount > 0) {
        const totalPrice = Object.values(ingredients).reduce((sum, price) => sum + price, 0);
        const avgPrice = totalPrice / ingredientCount;
        document.getElementById('avgPrice').textContent = avgPrice.toFixed(2);
    } else {
        document.getElementById('avgPrice').textContent = '0.00';
    }
}

// Оновити лічильник рецепту
function updateRecipeCounter() {
    document.getElementById('recipeCount').textContent = currentRecipe.length;
}

// Оновити відображення лічильника розрахунків
function updateCounterDisplay() {
    let calculationCounter = localStorage.getItem('calculationCounter') || 0;
    document.getElementById('calculationCounter').textContent = calculationCounter;
}

// Оновити лічильник розрахунків
function updateCalculationCounter() {
    let calculationCounter = parseInt(localStorage.getItem('calculationCounter') || 0);
    calculationCounter++;
    localStorage.setItem('calculationCounter', calculationCounter);
    
    // Оновити відображення
    document.getElementById('calculationCounter').textContent = calculationCounter;
    
    // Анімація
    const counterElement = document.getElementById('calculationCounter');
    counterElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        counterElement.style.transform = 'scale(1)';
    }, 300);
}

// Показати сповіщення
function showNotification(message, type = 'info') {
    // Видалити старі сповіщення
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    // Створити нове сповіщення
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 12px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    // Колір в залежності від типу
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        notification.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        notification.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + message;
    } else {
        notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        notification.innerHTML = '<i class="fas fa-info-circle"></i> ' + message;
    }
    
    document.body.appendChild(notification);
    
    // Автоматично прибрати через 4 секунди
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// ==================== ГЛОБАЛЬНЕ ЕКСПОРТУВАННЯ ====================

// Зробити функції доступними глобально
window.addIngredient = addIngredient;
window.addToRecipe = addToRecipe;
window.calculateRecipe = calculateRecipe;
window.clearRecipe = clearRecipe;
window.deleteIngredient = deleteIngredient;
window.removeFromRecipe = removeFromRecipe;
window.showNotification = showNotification;
window.updateCalculationCounter = updateCalculationCounter;

console.log('✅ script.js завантажено та готовий до роботи!');
