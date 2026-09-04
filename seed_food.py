import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import Product, Category

def seed_food():
    try:
        food_cat = Category.objects.get(name='Food')
        bev_cat = Category.objects.get(name='Beverages')
        snack_cat = Category.objects.get(name='Snacks')
        org_cat = Category.objects.get(name='Organic')
    except Category.DoesNotExist:
        print("Categories not found. Run seed_categories.py first.")
        return

    food_products = [
        {
            "name": "Single Origin Yirgacheffe",
            "brand": "Buna Origins",
            "description": "Premium floral and citrus notes from the highlands of Ethiopia.",
            "base_price": 450.00,
            "stock": 50,
            "category": bev_cat
        },
        {
            "name": "Organic Forest Honey",
            "brand": "Naturalia",
            "description": "Raw, unfiltered honey harvested from wild forests.",
            "base_price": 320.00,
            "stock": 30,
            "category": org_cat
        },
        {
            "name": "Spicy Kolo Mix",
            "brand": "Addis Snacks",
            "description": "Traditional roasted barley and nut mix with berbere spice.",
            "base_price": 85.00,
            "stock": 100,
            "category": snack_cat
        },
        {
            "name": "Dark Roast Jimma",
            "brand": "Buna Origins",
            "description": "Bold and earthy dark roast coffee beans.",
            "base_price": 380.00,
            "stock": 40,
            "category": bev_cat
        },
        {
            "name": "Dabo Kolo Buckets",
            "brand": "Mama's Kitchen",
            "description": "Crunchy snack nuggets, perfect for sharing.",
            "base_price": 120.00,
            "stock": 60,
            "category": snack_cat
        }
    ]

    for p in food_products:
        Product.objects.update_or_create(
            name=p['name'],
            defaults={
                'brand': p['brand'],
                'description': p['description'],
                'base_price': p['base_price'],
                'stock': p['stock'],
                'category': p['category']
            }
        )
    print("Food products seeded successfully!")

if __name__ == "__main__":
    seed_food()
