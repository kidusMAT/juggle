import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession, Category

def ultra_scale_population():
    print("WARNING: Starting Ultra-Scale Population (10,000+ entries)...")
    
    categories = list(Category.objects.all())
    users = list(User.objects.filter(is_juggler=True))
    
    if not categories or not users:
        print("Setup categories and jugglers first.")
        return

    brands = ["Nike", "Adidas", "Jordan", "Telfar", "Supreme", "Off-White", "Balenciaga", "Gucci", "Prada", "Rolex", "Cartier", "Hermes", "Louis Vuitton", "Dior"]
    item_types = ["Sneakers", "Hoodie", "Watch", "Bag", "Sunglasses", "Jacket", "T-Shirt", "Belt", "Wallet", "Perfume"]
    
    # 1. Bulk Create Products (2,000 items)
    print("Creating 2,000 products in bulk...")
    product_objs = []
    for i in range(2000):
        brand = random.choice(brands)
        item = random.choice(item_types)
        product_objs.append(Product(
            name=f"{brand} {item} Ultra-Spec #{i+1}",
            brand=brand,
            description=f"Ultra-scale test item {i+1}. High-performance database entry for stress testing.",
            base_price=random.randint(100, 50000),
            category=random.choice(categories),
            status='AVAILABLE',
            allow_juggling=True,
            stock=random.randint(10, 100)
        ))
    
    # Perform bulk create in chunks of 500 to stay safe
    Product.objects.bulk_create(product_objs, batch_size=500)
    print("Products created.")

    # Refresh product list
    all_products = list(Product.objects.filter(status='AVAILABLE'))
    
    # 2. Bulk Create Juggle Sessions (10,000 sessions)
    print("Creating 10,000 juggle sessions in bulk...")
    session_objs = []
    now = timezone.now()
    
    for i in range(10000):
        p = random.choice(all_products)
        u = random.choice(users)
        markup = int(float(p.base_price) * random.uniform(1.1, 2.0))
        lifespan = random.randint(60, 86400) # 1 min to 24 hours
        
        session_objs.append(JuggleSession(
            user=u,
            product=p,
            markup_price=markup,
            start_time=now,
            expires_at=now + timedelta(seconds=lifespan),
            is_active=True
        ))
        
        if i % 2000 == 0 and i > 0:
            print(f"Prepared {i} sessions...")

    JuggleSession.objects.bulk_create(session_objs, batch_size=1000)
    
    # Update product status to JUGGLED for those included
    juggled_p_ids = set(s.product_id for s in session_objs)
    Product.objects.filter(id__in=juggled_p_ids).update(status='JUGGLED')

    print(f"ULTRA-SCALE COMPLETE: 2,000 Products and 10,000 Sessions live.")

if __name__ == '__main__':
    ultra_scale_population()
