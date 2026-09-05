import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import Product, User, GlobalSettings
from django.utils import timezone

from django.contrib.auth.hashers import make_password

def seed():
    # Create 1000 test users for full pyramid rotation
    hashed_pwd = make_password('password123')
    existing_usernames = set(User.objects.values_list('username', flat=True))
    users_to_create = [
        User(username=f'juggler_{i}', password=hashed_pwd, actual_balance=10.00)
        for i in range(1, 1001) if f'juggler_{i}' not in existing_usernames
    ]
    if users_to_create:
        User.objects.bulk_create(users_to_create)
    print(f"1000 users seeded")

    # Create products
    products = [
        {"name": "iPhone 15 Pro", "brand": "Apple", "description": "Titanium build, A17 Pro chip.", "base_price": 4000.00, "stock": 8},
        {"name": "Galaxy S24 Ultra", "brand": "Samsung", "description": "AI-powered, 200MP camera.", "base_price": 3800.00, "stock": 10},
        {"name": "Air Max Pulse", "brand": "Nike", "description": "Next-gen Air cushioning.", "base_price": 800.00, "stock": 25},
        {"name": "WH-1000XM5", "brand": "Sony", "description": "Leading noise cancellation.", "base_price": 1200.00, "stock": 12},
        {"name": "MacBook Air M3", "brand": "Apple", "description": "Amazingly thin and fast.", "base_price": 6000.00, "stock": 6},
        {"name": "Tesla Model 3 Toy", "brand": "Tesla", "description": "Electric dream in pocket size.", "base_price": 150.00, "stock": 50},
        {"name": "Retro Camera", "brand": "Fujifilm", "description": "Classic aesthetic, modern tech.", "base_price": 950.00, "stock": 15},
        {"name": "Speedster Pro", "brand": "Specialized", "description": "Carbon fiber racing bike.", "base_price": 2500.00, "stock": 5},
        {"name": "Smart Watch Ultra", "brand": "Apple", "description": "Rugged and capable.", "base_price": 3200.00, "stock": 12},
        {"name": "Gaming Console X", "brand": "Microsoft", "description": "The most powerful console.", "base_price": 2200.00, "stock": 15},
    ]

    for p in products:
        Product.objects.update_or_create(
            name=p['name'],
            defaults={
                'brand': p['brand'],
                'description': p['description'], 
                'base_price': p['base_price'],
                'stock': p.get('stock', 1)
            }
        )
    print("Products seeded with brands")

    # Reset global settings
    settings = GlobalSettings.get_settings()
    settings.last_reset_time = timezone.now()
    settings.save()
    print("Global settings reset")

if __name__ == "__main__":
    seed()
