import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession

def simulate_juggles():
    products = list(Product.objects.filter(is_limited=True))
    users = list(User.objects.filter(is_juggler=True))
    now = timezone.now()
    
    if not products or not users:
        print("Missing products or jugglers to simulate.")
        return

    for _ in range(25):
        p = random.choice(products)
        u = random.choice(users)
        markup = int(float(p.base_price) * random.uniform(1.05, 1.8))
        
        # Mix of immediate volatility and trending
        lifespan = random.randint(45, 1200) 
        
        JuggleSession.objects.create(
            user=u,
            product=p,
            markup_price=markup,
            start_time=now,
            expires_at=now + timedelta(seconds=lifespan),
            is_active=True
        )
        print(f"Simulated: {p.name} by {u.username} (Expiring in {lifespan}s)")

if __name__ == '__main__':
    simulate_juggles()
