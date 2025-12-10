// Глобальні змінні
let ingredients = {};
let currentRecipe = [];

// ==================== ОСНОВНІ ФУНКЦІЇ ====================

// Завантажити інгредієнти при запуску
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM завантажено');
    loadIngredients();
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
            ingredients = data.ingredients;
            console.log('✅ Інгредієнтів завантажено:', Object.keys(ingredients).length);
            updateIngredientsList();
            updateRecipeSelect();
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
    
    // Очистити поле грамів
    gramsInput.value = '';
    
    showNotification('✅ Додано до рецепту: ' + name, 'success');
}

// Видалити з рецепту
function removeFromRecipe(index) {
    currentRecipe.splice(index, 1);
    updateRecipeTable();
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
            
            // Додати деталі
            let details = '📋 Деталі:\n';
            result.details.forEach(item => {
                details += `• ${item.name}: ${item.grams}г = ${item.cost} грн\n`;
            });
            
            showNotification('✅ Розраховано: ' + result.total_cost.toFixed(2) + ' грн', 'success');
            console.log(details);
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
        
        // Скинути результати
        document.getElementById('totalCost').textContent = '0.00';
        document.getElementById('totalWeight').textContent = '0';
        document.getElementById('costPer100g').textContent = '0.00';
        
        showNotification('✅ Рецепт очищено', 'success');
    }
}

// ==================== ДОПОМІЖНІ ФУНКЦІЇ ====================

// Оновити список інгредієнтів
function updateIngredientsList() {
    const tbody = document.getElementById('ingredientsList');
    tbody.innerHTML = '';
    
    for (const [name, price] of Object.entries(ingredients)) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${price.toFixed(2)} грн</td>
            <td>
                <button onclick="deleteIngredient('${name}')" 
                        style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Видалити
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
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
    
    currentRecipe.forEach((item, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.grams} г</td>
            <td>${item.cost.toFixed(2)} грн</td>
            <td>
                <button onclick="removeFromRecipe(${index})" 
                        style="padding: 5px 10px; background: #ff9800; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Видалити
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Показати сповіщення
function showNotification(message, type) {
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
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Автоматично прибрати через 3 секунди
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Додати CSS анімації для сповіщень
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Зробити функції доступними глобально
window.addIngredient = addIngredient;
window.addToRecipe = addToRecipe;
window.calculateRecipe = calculateRecipe;
window.clearRecipe = clearRecipe;
window.deleteIngredient = deleteIngredient;
window.removeFromRecipe = removeFromRecipe;

console.log('✅ script.js завантажено та готовий до роботи!');
