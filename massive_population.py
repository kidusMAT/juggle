import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession, Category

def massive_population():
    print("Starting Massive Population for Pagination Testing...")
    
    # 1. Ensure we have categories
    categories = list(Category.objects.all())
    if not categories:
        Category.objects.create(name="Streetwear")
        Category.objects.create(name="Luxury")
        Category.objects.create(name="Footwear")
        categories = list(Category.objects.all())

    # 2. Get users/jugglers
    users = list(User.objects.filter(is_juggler=True))
    if not users:
        print("No jugglers found. Please ensure users exist.")
        return

    # 3. Create 200 Products
    brands = ["Nike", "Adidas", "Jordan", "Telfar", "Supreme", "Off-White", "Balenciaga", "Gucci", "Prada", "Rolex"]
    item_types = ["Sneakers", "Hoodie", "Watch", "Bag", "Sunglasses", "Jacket", "T-Shirt"]
    
    new_products = []
    for i in range(200):
        brand = random.choice(brands)
        item = random.choice(item_types)
        p = Product.objects.create(
            name=f"{brand} {item} V{i+1}",
            brand=brand,
            description=f"Massive simulation product number {i+1}. Perfect for testing pagination and infinite scroll performance.",
            base_price=random.randint(500, 25000),
            category=random.choice(categories),
            status='AVAILABLE',
            allow_juggling=True,
            stock=random.randint(5, 50)
        )
        new_products.append(p)
        if i % 50 == 0: print(f"Created {i} products...")

    # 4. Create 500+ Juggles
    print("Injecting 500+ Active Juggles...")
    now = timezone.now()
    for _ in range(500):
        p = random.choice(new_products)
        u = random.choice(users)
        markup = int(float(p.base_price) * random.uniform(1.1, 1.6))
        
        # Varied expirations
        lifespan = random.randint(30, 3600) # 30s to 1 hour
        
        JuggleSession.objects.create(
            user=u,
            product=p,
            markup_price=markup,
            start_time=now,
            expires_at=now + timedelta(seconds=lifespan),
            is_active=True
        )
        
    print("Massive Population Complete! Over 700 new data points added.")

if __name__ == '__main__':
    massive_population()
