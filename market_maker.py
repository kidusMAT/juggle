import os
import django
from django.utils import timezone
from datetime import timedelta
import random
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession

def run_market_maker():
    print("Starting Market Maker Bot...")
    juggler_pool = list(User.objects.filter(is_juggler=True))
    if not juggler_pool:
        print("No jugglers found. Exiting.")
        return

    products = list(Product.objects.filter(is_limited=True))
    if not products:
        print("No limited products found. Exiting.")
        return

    print("Market Maker running. Injecting live volatility every 15 seconds...")
    try:
        while True:
            # Clean up ancient expired sessions to keep DB clean
            now = timezone.now()
            JuggleSession.objects.filter(expires_at__lt=now - timedelta(minutes=5)).delete()

            # Randomly select 2 to 5 products to drop right now
            drop_count = random.randint(2, 5)
            for _ in range(drop_count):
                product = random.choice(products)
                juggler = random.choice(juggler_pool)
                # Random markup between 5% and 40%
                markup = float(product.base_price) * random.uniform(1.05, 1.4)
                
                # Expirations between 30 seconds and 5 minutes
                lifespan = random.randint(30, 300)
                
                JuggleSession.objects.create(
                    user=juggler,
                    product=product,
                    markup_price=int(markup),
                    start_time=now,
                    expires_at=now + timedelta(seconds=lifespan),
                    is_active=True
                )
                print(f"[MARKET TILE] Dropped {product.name} (Markup: {int(markup)}, Expiring in {lifespan}s)")
            
            # Wait 8 seconds before the next wave (faster volatility)
            time.sleep(8)
    except KeyboardInterrupt:
        print("Market Maker stopped.")

if __name__ == '__main__':
    run_market_maker()
