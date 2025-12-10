from flask import Flask, render_template, request, jsonify, send_file
import json
import os
import csv
from datetime import datetime
from io import StringIO

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-here'

DATA_FILE = 'data.json'

class BakingCalculator:
    def __init__(self):
        self.data = self.load_data()
    
    def load_data(self):
        """Завантажує дані з файлу"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        
        # Створюємо структуру для нових даних
        return {
            'ingredients': {},
            'recipes': {},
            'settings': {
                'currency': 'грн',
                'default_unit': 'г'
            }
        }
    
    def save_data(self):
        """Зберігає дані у файл"""
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Помилка збереження: {e}")
            return False
    
    def add_ingredient(self, name, price_per_kg, category='інше'):
        """Додає новий інгредієнт"""
        self.data['ingredients'][name] = {
            'price_per_kg': float(price_per_kg),
            'price_per_gram': float(price_per_kg) / 1000,
            'category': category,
            'created_at': datetime.now().isoformat()
        }
        return self.save_data()
    
    def delete_ingredient(self, name):
        """Видаляє інгредієнт"""
        if name in self.data['ingredients']:
            del self.data['ingredients'][name]
            return self.save_data()
        return False
    
    def calculate_recipe(self, items):
        """Розраховує вартість рецепту"""
        total_cost = 0
        total_weight = 0
        details = []
        
        for item in items:
            name = item['name']
            grams = float(item['grams'])
            
            if name in self.data['ingredients']:
                ing = self.data['ingredients'][name]
                cost = grams * ing['price_per_gram']
                total_cost += cost
                total_weight += grams
                
                details.append({
                    'name': name,
                    'grams': grams,
                    'cost_per_gram': ing['price_per_gram'],
                    'cost': cost
                })
        
        # Розрахунок додаткових показників
        cost_per_100g = (total_cost / total_weight * 100) if total_weight > 0 else 0
        cost_per_kg = total_cost / total_weight * 1000 if total_weight > 0 else 0
        
        return {
            'total_cost': round(total_cost, 2),
            'total_weight': round(total_weight, 2),
            'cost_per_100g': round(cost_per_100g, 2),
            'cost_per_kg': round(cost_per_kg, 2),
            'items': details
        }
    
    def save_recipe(self, name, items, total_cost):
        """Зберігає рецепт"""
        self.data['recipes'][name] = {
            'items': items,
            'total_cost': total_cost,
            'created_at': datetime.now().isoformat()
        }
        return self.save_data()
    
    def get_categories(self):
        """Отримує список категорій"""
        categories = set()
        for ing in self.data['ingredients'].values():
            categories.add(ing['category'])
        return list(categories)

# Створюємо екземпляр калькулятора
calculator = BakingCalculator()

# Маршрути Flask
@app.route('/')
def index():
    """Головна сторінка"""
    return render_template('index.html')

@app.route('/api/ingredients', methods=['GET'])
def get_ingredients():
    """Отримати список інгредієнтів"""
    ingredients = calculator.data['ingredients']
    
    # Форматуємо для фронтенду
    formatted = []
    for name, data in ingredients.items():
        formatted.append({
            'name': name,
            'price_per_kg': data['price_per_kg'],
            'price_per_gram': data['price_per_gram'],
            'category': data.get('category', 'інше')
        })
    
    return jsonify({
        'success': True,
        'ingredients': formatted,
        'categories': calculator.get_categories()
    })

@app.route('/api/ingredients', methods=['POST'])
def add_ingredient():
    """Додати новий інгредієнт"""
    data = request.json
    name = data.get('name', '').strip()
    price = data.get('price', 0)
    category = data.get('category', 'інше')
    
    if not name or price <= 0:
        return jsonify({'success': False, 'error': 'Невірні дані'})
    
    if calculator.add_ingredient(name, price, category):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Помилка збереження'})

@app.route('/api/ingredients/<name>', methods=['DELETE'])
def delete_ingredient(name):
    """Видалити інгредієнт"""
    if calculator.delete_ingredient(name):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Інгредієнт не знайдено'})

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """Розрахувати вартість рецепту"""
    data = request.json
    items = data.get('items', [])
    
    if not items:
        return jsonify({'success': False, 'error': 'Немає інгредієнтів для розрахунку'})
    
    result = calculator.calculate_recipe(items)
    return jsonify({
        'success': True,
        'result': result
    })

@app.route('/api/recipes', methods=['POST'])
def save_recipe():
    """Зберегти рецепт"""
    data = request.json
    name = data.get('name', '').strip()
    items = data.get('items', [])
    total_cost = data.get('total_cost', 0)
    
    if not name:
        return jsonify({'success': False, 'error': 'Введіть назву рецепту'})
    
    if calculator.save_recipe(name, items, total_cost):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Помилка збереження'})

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    """Отримати список рецептів"""
    recipes = []
    for name, data in calculator.data['recipes'].items():
        recipes.append({
            'name': name,
            'total_cost': data['total_cost'],
            'created_at': data['created_at'],
            'item_count': len(data['items'])
        })
    
    return jsonify({
        'success': True,
        'recipes': recipes
    })

@app.route('/api/export/csv')
def export_csv():
    """Експортувати інгредієнти у CSV"""
    output = StringIO()
    writer = csv.writer(output)
    
    # Заголовки
    writer.writerow(['Назва', 'Категорія', 'Ціна за кг (грн)', 'Ціна за г (грн)'])
    
    # Дані
    for name, data in calculator.data['ingredients'].items():
        writer.writerow([
            name,
            data.get('category', 'інше'),
            data['price_per_kg'],
            data['price_per_gram']
        ])
    
    output.seek(0)
    return send_file(
        StringIO(output.getvalue()),
        mimetype='text/csv',
        as_attachment=True,
        download_name='ingredients.csv'
    )

@app.route('/api/backup')
def backup_data():
    """Створити резервну копію даних"""
    return jsonify({
        'success': True,
        'data': calculator.data
    })

@app.route('/api/restore', methods=['POST'])
def restore_data():
    """Відновити дані з резервної копії"""
    data = request.json.get('data')
    if data:
        calculator.data = data
        if calculator.save_data():
            return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Помилка відновлення'})

if __name__ == '__main__':
    # Створюємо необхідні папки
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    # Запускаємо сервер
    print("🌐 Запускаємо веб-калькулятор...")
    print("📖 Відкрийте у браузері: http://localhost:5000")
    print("🛑 Для зупинки натисніть Ctrl+C")
    app.run(debug=True, host='0.0.0.0', port=8080)
