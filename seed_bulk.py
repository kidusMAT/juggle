import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product

def seed_bulk_products():
    print("--- Seeding 50 Products for Scroll Testing ---")
    seller = User.objects.first()
    brands = ["Apple", "Sony", "Nike", "Adidas", "Logitech", "Samsung", "Generic"]
    
    for i in range(1, 51):
        Product.objects.create(
            name=f"Pulse Item #{i:02d}",
            brand=random.choice(brands),
            description=f"High-quality prototype #{i}. Perfect for testing the deep-pyramid scroll behavior.",
            base_price=random.randint(5, 500),
            status='JUGGLED', # Make them visible in shop immediately
            allow_juggling=True,
            seller=seller,
            stock=10
        )
    print(f"Success: {Product.objects.count()} products now in database.")

if __name__ == "__main__":
    seed_bulk_products()
