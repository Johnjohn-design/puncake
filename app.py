from flask import Flask, render_template, jsonify, request
import json
import os
from datetime import datetime

app = Flask(__name__)

# Налаштування
DATA_FILE = 'ingredients.json'

def load_data():
    """Завантажити дані з файлу"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_data(data):
    """Зберегти дані у файл"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

# Маршрути
@app.route('/')
def index():
    """Головна сторінка"""
    return render_template('index.html')

@app.route('/api/ingredients', methods=['GET'])
def get_ingredients():
    """Отримати всі інгредієнти"""
    ingredients = load_data()
    return jsonify({
        'success': True,
        'ingredients': ingredients,
        'count': len(ingredients)
    })

@app.route('/api/ingredients', methods=['POST'])
def add_ingredient():
    """Додати новий інгредієнт"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        price = float(data.get('price', 0))
        
        if not name or price <= 0:
            return jsonify({'success': False, 'error': 'Некоректні дані'})
        
        ingredients = load_data()
        ingredients[name] = price
        save_data(ingredients)
        
        return jsonify({'success': True, 'message': f'Додано: {name}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/ingredients/<name>', methods=['DELETE'])
def delete_ingredient(name):
    """Видалити інгредієнт"""
    try:
        ingredients = load_data()
        if name in ingredients:
            del ingredients[name]
            save_data(ingredients)
            return jsonify({'success': True, 'message': f'Видалено: {name}'})
        return jsonify({'success': False, 'error': 'Не знайдено'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """Розрахувати вартість рецепту"""
    try:
        data = request.json
        items = data.get('items', [])
        
        ingredients = load_data()
        total_cost = 0
        total_weight = 0
        details = []
        
        for item in items:
            name = item.get('name', '')
            grams = float(item.get('grams', 0))
            
            if name in ingredients:
                price_per_kg = ingredients[name]
                cost = (price_per_kg / 1000) * grams
                total_cost += cost
                total_weight += grams
                
                details.append({
                    'name': name,
                    'grams': grams,
                    'cost': round(cost, 2)
                })
        
        # Розрахунок додаткових показників
        cost_per_100g = (total_cost / total_weight * 100) if total_weight > 0 else 0
        
        return jsonify({
            'success': True,
            'result': {
                'total_cost': round(total_cost, 2),
                'total_weight': round(total_weight, 2),
                'cost_per_100g': round(cost_per_100g, 2),
                'details': details
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 Сервер запущено на порту {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
