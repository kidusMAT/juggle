import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession

def seed_persistent_juggles():
    print("Creating persistent juggles for demo...")
    try:
        admin_user = User.objects.get(id=1)
    except User.DoesNotExist:
        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()

    products = list(Product.objects.filter(is_limited=True))
    if not products:
        print("No limited products found. Please run seed_goat.py first.")
        return

    now = timezone.now()
    # Create 15 long-lived juggles (persistent shop content)
    for _ in range(15):
        product = random.choice(products)
        juggler = admin_user
        # High markup for trending, low for urgent (for variety)
        markup = float(product.base_price) * random.uniform(1.1, 1.6)
        
        # 10 persistent ones for SHOP always having content
        # Mix of soon and far expirations
        lifespan = random.randint(30, 86400) # From 30s to 24h
        
        JuggleSession.objects.create(
            user=juggler,
            product=product,
            markup_price=int(markup),
            start_time=now,
            expires_at=now + timedelta(seconds=lifespan),
            is_active=True
        )
        print(f"Created persistent juggle for {product.name} (Expiring in {lifespan}s)")

if __name__ == '__main__':
    seed_persistent_juggles()
